import { createOpenAI } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import type { z } from 'zod';

type AgentConfig<TOutSchema extends z.ZodType> = {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  outSchema: TOutSchema;
  /**
   * Optional label emitted verbatim as `call_site`. Left unset it is derived
   * from the system prompt, which is distinct at every call site today, so
   * `analyze-week` reads apart from `generate-plan` without the six callers
   * having to pass anything.
   */
  callSite?: string;
};

/**
 * Everything worth logging about one `generateText` call, read off the typed
 * result while it is still in scope.
 */
type ModelCallObservation = {
  output: unknown;
  usage: unknown;
  finishReason: string;
  responseId: string;
  responseModelId: string;
};

/**
 * Workers Logs drops oversized events, and a dropped line takes the model id,
 * the latency and the token usage with it. Cap the free-text fields instead so
 * the structure always survives; `*_chars` carries the real size, so a
 * truncated field is visible rather than silent.
 */
const MAX_LOGGED_CHARS = 16_000;

const LEADING_ARTICLE = /^you-are-an?-/;

function truncate(value: string): string {
  return value.length <= MAX_LOGGED_CHARS ? value : value.slice(0, MAX_LOGGED_CHARS);
}

/**
 * FNV-1a over the system prompt. Exact-match grouping key for one call site,
 * and it changes when the prompt changes — which is itself worth seeing in a
 * cohort whose plans are read by hand.
 */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** `You are a strength coach analyzing one completed training week. …` becomes
 * `strength-coach-analyzing-one-completed-training-week`. */
function deriveCallSite(system: string): string {
  const firstSentence = system.split('. ')[0] ?? system;
  const slug = firstSentence
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(LEADING_ARTICLE, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug === '' ? 'unlabelled' : slug;
}

function describeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: 'unknown', message: String(error) };
}

/** JSON only if it fits; an oversized payload degrades to a capped string
 * rather than costing us the rest of the line. */
function loggedOutput(output: unknown): unknown {
  const serialised = JSON.stringify(output) ?? 'undefined';
  return serialised.length <= MAX_LOGGED_CHARS ? output : truncate(serialised);
}

function buildModelCallLog<TOutSchema extends z.ZodType>(
  agentConfig: AgentConfig<TOutSchema>,
  latencyMs: number,
  observed: ModelCallObservation | undefined,
  failure: unknown,
) {
  return {
    event: 'llm_call' as const,
    // Unique per attempt: a step that retries twice emits three lines that
    // differ here, so a retry is not mistaken for one slow call.
    call_id: crypto.randomUUID(),
    call_site: agentConfig.callSite ?? deriveCallSite(agentConfig.system),
    system_fingerprint: fingerprint(agentConfig.system),
    model: agentConfig.model,
    status: failure === undefined ? ('ok' as const) : ('error' as const),
    latency_ms: latencyMs,
    system: truncate(agentConfig.system),
    prompt: truncate(agentConfig.prompt),
    prompt_chars: agentConfig.prompt.length,
    ...(observed === undefined
      ? {}
      : {
          output: loggedOutput(observed.output),
          // The cost data. Returned by the AI SDK on every call and, until
          // now, dropped on the floor.
          usage: observed.usage,
          finish_reason: observed.finishReason,
          response_id: observed.responseId,
          response_model_id: observed.responseModelId,
        }),
    ...(failure === undefined ? {} : { error: describeError(failure) }),
  };
}

function emitModelCallLog(line: ReturnType<typeof buildModelCallLog>): void {
  try {
    // One line, stringified rather than passed as an object: workerd's console
    // formatter elides deeply nested values, which is exactly the prompt and
    // output this exists to capture.
    console.log(JSON.stringify(line));
  } catch {
    // A log line must never become the reason a model call fails.
    console.log(
      JSON.stringify({
        event: 'llm_call',
        call_site: line.call_site,
        status: line.status,
        latency_ms: line.latency_ms,
        log_error: 'llm_call line was not serialisable',
      }),
    );
  }
}

export async function getAgentRuntime<TOutSchema extends z.ZodType>(
  agentConfig: AgentConfig<TOutSchema>,
): Promise<z.infer<TOutSchema>> {
  if (!agentConfig.apiKey) {
    throw new Error('OPENAI_API_KEY is required for workflow LLM activities');
  }
  const openai = createOpenAI({ apiKey: agentConfig.apiKey });

  const startedAt = Date.now();
  let observed: ModelCallObservation | undefined;
  let failure: unknown;

  try {
    const result = await generateText({
      model: openai(agentConfig.model),
      system: agentConfig.system,
      prompt: agentConfig.prompt,
      output: Output.object({ schema: agentConfig.outSchema }),
    });

    observed = {
      output: result.output,
      usage: result.usage,
      finishReason: result.finishReason,
      responseId: result.finalStep.response.id,
      responseModelId: result.finalStep.response.modelId,
    };

    if (result.output === undefined || result.output === null) {
      throw new Error('model returned no structured output');
    }

    return agentConfig.outSchema.parse(result.output);
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    // In `finally` so every exit path — returned, thrown by the provider,
    // thrown for missing output, thrown by the schema — emits exactly one line.
    emitModelCallLog(buildModelCallLog(agentConfig, Date.now() - startedAt, observed, failure));
  }
}
