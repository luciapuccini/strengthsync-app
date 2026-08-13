import { createOpenAI } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import type { z } from 'zod';

type AgentConfig<TOutSchema extends z.ZodType> = {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  outSchema: TOutSchema;
};

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
  });

  if (result.output === undefined || result.output === null) {
    throw new Error('model returned no structured output');
  }

  return agentConfig.outSchema.parse(result.output);
}
