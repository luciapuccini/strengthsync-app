import { createOpenAI } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import type { z } from 'zod';
import { registerLlmCallLogger } from './telemetry.ts';

type AgentConfig<TOutSchema extends z.ZodType> = {
  apiKey: string;
  model: string;
  /**
   * Grouping key for this call's logs, passed through as the AI SDK's
   * `telemetry.functionId`. Use the workflow step name — `analyze-week`,
   * `generate-plan` — so a step can be read on its own in Workers Logs.
   */
  callSite: string;
  system: string;
  prompt: string;
  outSchema: TOutSchema;
};

// Module scope, so it happens once per isolate rather than once per call.
registerLlmCallLogger();

export async function getAgentRuntime<TOutSchema extends z.ZodType>(
  agentConfig: AgentConfig<TOutSchema>,
): Promise<z.infer<TOutSchema>> {
  if (!agentConfig.apiKey) {
    throw new Error('OPENAI_API_KEY is required for workflow LLM activities');
  }
  const openai = createOpenAI({ apiKey: agentConfig.apiKey });

  // `result.output` is the schema-validated object, and its getter throws
  // `NoOutputGeneratedError` when the model produced nothing usable — so the
  // "no structured output" and "output did not match the schema" cases are the
  // SDK's to raise, and arrive at callers as a rejection either way.
  const result = await generateText({
    model: openai(agentConfig.model),
    system: agentConfig.system,
    prompt: agentConfig.prompt,
    output: Output.object({ schema: agentConfig.outSchema }),
    // Everything worth logging about this call — prompt, model, latency, usage,
    // errors — is emitted by the integration this registers. See ./telemetry.ts.
    telemetry: { functionId: agentConfig.callSite },
  });

  // The cast, not a second `outSchema.parse`: `Output.object` has already
  // validated against this schema, but TypeScript cannot follow the output
  // generic through a schema that is itself generic here.
  return result.output as z.infer<TOutSchema>;
}
