import { createOpenAI } from '@ai-sdk/openai';
import { generateText, Output, streamText, type DeepPartial, type LanguageModel } from 'ai';
import type { z } from 'zod';
import { registerLlmCallLogger } from './telemetry.ts';

type AgentConfig<TOutSchema extends z.ZodType> = {
  apiKey: string;
  model: string;
  callSite: string;
  system: string;
  prompt: string;
  outSchema: TOutSchema;
};

/**
 * The in-flight view of a structured-output call: the object as it is being
 * written, then the object once it has been parsed.
 *
 * Declared by hand rather than leaking the SDK's result type, so a caller sees
 * the two things a stream is for and nothing else.
 */
export type StreamingAgentResult<TOutSchema extends z.ZodType> = {
  partialOutputStream: AsyncIterable<DeepPartial<z.infer<TOutSchema>>>;
  output: PromiseLike<z.infer<TOutSchema>>;
};

// Module scope, so it happens once per isolate rather than once per call.
registerLlmCallLogger();

/**
 * The one place the API key is checked and the provider is built. Both entry
 * points below go through it, so a streaming call cannot end up with its own
 * copy of the provider setup.
 */
function resolveModel<TOutSchema extends z.ZodType>(
  agentConfig: AgentConfig<TOutSchema>,
): LanguageModel {
  if (!agentConfig.apiKey) {
    throw new Error('OPENAI_API_KEY is required for workflow LLM activities');
  }
  return createOpenAI({ apiKey: agentConfig.apiKey })(agentConfig.model);
}

export async function getAgentRuntime<TOutSchema extends z.ZodType>(
  agentConfig: AgentConfig<TOutSchema>,
): Promise<z.infer<TOutSchema>> {
  const result = await generateText({
    model: resolveModel(agentConfig),
    system: agentConfig.system,
    prompt: agentConfig.prompt,
    output: Output.object({ schema: agentConfig.outSchema }),
    telemetry: { functionId: agentConfig.callSite },
  });

  return result.output as z.infer<TOutSchema>;
}

/**
 * The streaming counterpart of `getAgentRuntime`. Same provider, same guard,
 * same telemetry registration — the only difference is that the caller can
 * watch the object being written instead of waiting for it.
 *
 * Not async: the result is available immediately and the work happens as its
 * streams are consumed.
 */
export function streamAgentRuntime<TOutSchema extends z.ZodType>(
  agentConfig: AgentConfig<TOutSchema>,
): StreamingAgentResult<TOutSchema> {
  const result = streamText({
    model: resolveModel(agentConfig),
    system: agentConfig.system,
    prompt: agentConfig.prompt,
    output: Output.object({ schema: agentConfig.outSchema }),
    telemetry: { functionId: agentConfig.callSite },
  });

  return {
    partialOutputStream: result.partialOutputStream as AsyncIterable<
      DeepPartial<z.infer<TOutSchema>>
    >,
    output: result.output as PromiseLike<z.infer<TOutSchema>>,
  };
}
