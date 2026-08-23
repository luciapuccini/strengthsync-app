import { createOpenAI } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
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

// Module scope, so it happens once per isolate rather than once per call.
registerLlmCallLogger();

export async function getAgentRuntime<TOutSchema extends z.ZodType>(
  agentConfig: AgentConfig<TOutSchema>,
): Promise<z.infer<TOutSchema>> {
  if (!agentConfig.apiKey) {
    throw new Error('OPENAI_API_KEY is required for workflow LLM activities');
  }
  const openai = createOpenAI({ apiKey: agentConfig.apiKey });

  const result = await generateText({
    model: openai(agentConfig.model),
    system: agentConfig.system,
    prompt: agentConfig.prompt,
    output: Output.object({ schema: agentConfig.outSchema }),
    telemetry: { functionId: agentConfig.callSite },
  });

  return result.output as z.infer<TOutSchema>;
}
