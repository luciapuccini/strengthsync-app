import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import type { z } from "zod";

import {
  buildGeneratePlanPrompt,
  buildSummarizeHistoryPrompt,
  buildSummarizeProfilePrompt,
  HistorySummarySchema,
  ProfileSummarySchema,
  type GeneratePlanPromptInput,
  type HistorySummary,
  type ProfileSummary,
  type SummarizeHistoryPromptInput,
  type SummarizeProfilePromptInput,
  type WorkflowLlmStep,
} from "@strengthsync/domain/coach";
import {
  GeneratedPlanInputSchema,
  type GeneratedPlanInput,
} from "@strengthsync/domain/contracts";

/**
 * Mandatory trace capture for every workflow LLM call, including failures.
 * `apps/workflows` supplies the Braintrust-backed implementation; agent
 * helpers must call it for every request. Traces go to the observability
 * provider — never to the product database.
 * See docs/architecture/monorepo_structure.md.
 */
export type LlmCallRecorder = {
  record(input: {
    /** Provider trace/workflow correlation; no product DB record is required. */
    workflow_id: string | null;
    client_id: string;
    step: string;
    model: string;
    input: unknown;
    output: unknown | null;
    error: string | null;
    latency_ms: number;
  }): Promise<void>;
};

/**
 * Context every workflow LLM activity must provide alongside the recorder.
 * Production configuration fails fast when no recorder is supplied.
 */
export type WorkflowLlmContext = {
  workflow_id: string | null;
  client_id: string;
  step: WorkflowLlmStep;
  recorder: LlmCallRecorder;
  model: string;
};

/** Provider-independent structured generation used by workflow activities. */
export type AgentRuntime = {
  generateObject<T>(args: {
    model: string;
    schema: z.ZodType<T>;
    system: string;
    prompt: string;
  }): Promise<T>;
};

/** OpenAI-backed runtime */
export function createOpenAiRuntime(apiKey: string): AgentRuntime {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for workflow LLM activities");
  }
  const openai = createOpenAI({ apiKey });
  return {
    async generateObject({ model, schema, system, prompt }) {
      const result = await generateText({
        model: openai(model),
        system,
        prompt,
        output: Output.object({ schema }),
      });
      if (result.output === undefined || result.output === null) {
        throw new Error("model returned no structured output");
      }
      return schema.parse(result.output);
    },
  };
}

/**
 * Run an LLM call, always recording success or failure through the injected recorder.
 */
export async function withLlmRecording<T>(
  context: WorkflowLlmContext,
  input: unknown,
  run: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    const output = await run();
    await context.recorder.record({
      workflow_id: context.workflow_id,
      client_id: context.client_id,
      step: context.step,
      model: context.model,
      input,
      output,
      error: null,
      latency_ms: Date.now() - started,
    });
    return output;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown LLM error";
    await context.recorder.record({
      workflow_id: context.workflow_id,
      client_id: context.client_id,
      step: context.step,
      model: context.model,
      input,
      output: null,
      error: message,
      latency_ms: Date.now() - started,
    });
    throw err;
  }
}

export async function summarizeProfile(
  runtime: AgentRuntime,
  context: WorkflowLlmContext,
  input: SummarizeProfilePromptInput,
): Promise<ProfileSummary> {
  const prompt = buildSummarizeProfilePrompt(input);
  return withLlmRecording(context, input, async () => {
    const object = await runtime.generateObject({
      model: context.model,
      schema: ProfileSummarySchema,
      system: prompt.system,
      prompt: prompt.prompt,
    });
    return ProfileSummarySchema.parse(object);
  });
}

export async function summarizeHistory(
  runtime: AgentRuntime,
  context: WorkflowLlmContext,
  input: SummarizeHistoryPromptInput,
): Promise<HistorySummary> {
  const prompt = buildSummarizeHistoryPrompt(input);
  return withLlmRecording(context, input, async () => {
    const object = await runtime.generateObject({
      model: context.model,
      schema: HistorySummarySchema,
      system: prompt.system,
      prompt: prompt.prompt,
    });
    return HistorySummarySchema.parse(object);
  });
}

export async function generatePlan(
  runtime: AgentRuntime,
  context: WorkflowLlmContext,
  input: GeneratePlanPromptInput,
): Promise<GeneratedPlanInput> {
  const prompt = buildGeneratePlanPrompt(input);
  return withLlmRecording(context, input, async () => {
    const object = await runtime.generateObject({
      model: context.model,
      schema: GeneratedPlanInputSchema,
      system: prompt.system,
      prompt: prompt.prompt,
    });
    const plan = GeneratedPlanInputSchema.parse(object);
    return plan;
  });
}
