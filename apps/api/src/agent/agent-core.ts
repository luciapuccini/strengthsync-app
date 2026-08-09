import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import type { z } from "zod";

export type AgentRuntime = {
  generateObject<T>(args: {
    model: string;
    schema: z.ZodType<T>;
    system: string;
    prompt: string;
  }): Promise<T>;
};

type AgentConfig = {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  schema: z.ZodSchema;
};

// apiKey probably does not exist in this context, so we need to pass it
export async function getAgentRuntime(
  agentConfig: AgentConfig,
): Promise<AgentRuntime> {
  if (!agentConfig.apiKey) {
    throw new Error("OPENAI_API_KEY is required for workflow LLM activities");
  }
  const openai = createOpenAI({ apiKey: agentConfig.apiKey });

  const result = await generateText({
    model: openai(agentConfig.model),
    system: agentConfig.system,
    prompt: agentConfig.prompt,
    output: Output.object({ schema: agentConfig.schema }),
  });

  if (result.output === undefined || result.output === null) {
    throw new Error("model returned no structured output");
  }

  return agentConfig.schema.parse(result.output) as AgentRuntime;
}
