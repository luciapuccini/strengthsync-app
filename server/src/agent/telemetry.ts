import { registerTelemetry, type Telemetry } from 'ai';

/**
 * Workers Logs drops oversized events, and a dropped line takes the model id,
 * the latency and the token usage with it. Cap the free-text payloads instead
 * so the structure always survives; the `*_chars` fields carry the real size,
 * so a truncated payload is visible rather than silent.
 */
const MAX_LOGGED_CHARS = 16_000;

/**
 * What `onStart` knows and the later events do not: the prompt as actually
 * sent, and when the call began. Carried forward so one model call is one log
 * line rather than two half ones.
 */
type PendingCall = {
  callSite: string;
  provider: string;
  model: string;
  prompt: unknown;
  startedAt: number;
  /** True once this call has produced a line. See the sweep in `onStart`. */
  settled: boolean;
};

/**
 * Keyed by the SDK's `callId`. Entries outlive `onEnd` on purpose: structured
 * output is parsed *after* the end event, so a schema rejection arrives at
 * `onError` afterwards and would otherwise have no prompt to name.
 */
const pending = new Map<string, PendingCall>();

type Capped = { value: unknown; chars: number };

/** JSON only if it fits; an oversized payload degrades to a capped string
 * rather than costing us the rest of the line. */
function cap(value: unknown): Capped {
  const serialised = JSON.stringify(value) ?? 'undefined';
  return serialised.length <= MAX_LOGGED_CHARS
    ? { value, chars: serialised.length }
    : { value: serialised.slice(0, MAX_LOGGED_CHARS), chars: serialised.length };
}

function describeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: 'unknown', message: String(error) };
}

/**
 * Stringified rather than passed as an object: workerd's console formatter
 * elides deeply nested values, which is exactly the prompt and output this
 * exists to capture.
 */
function emit(line: Record<string, unknown>): void {
  try {
    console.log(JSON.stringify(line));
  } catch {
    // These callbacks are awaited inside `generateText`, so a throw here would
    // fail the model call. A log line must never become that reason.
    console.log(
      JSON.stringify({
        event: 'llm_call',
        call_id: line.call_id,
        call_site: line.call_site,
        status: line.status,
        latency_ms: line.latency_ms,
        log_error: 'llm_call line was not serialisable',
      }),
    );
  }
}

/**
 * The `onError` event is typed `unknown` by the SDK but dispatched as
 * `{ callId, error }` — which is what lets a failure name the prompt that
 * caused it, so it is worth narrowing by hand.
 */
function readErrorEvent(event: unknown): { callId: string; error: unknown } | undefined {
  if (typeof event !== 'object' || event === null || !('callId' in event)) return undefined;
  const { callId, error } = event as { callId: unknown; error?: unknown };
  return typeof callId === 'string' ? { callId, error } : undefined;
}

/**
 * One structured JSON line per model call, built from the AI SDK's own
 * telemetry lifecycle rather than from timers and field reads around the call.
 *
 * `call_site` is `telemetry.functionId`, passed by `getAgentRuntime` from
 * `AgentConfig.callSite`, so `analyze-week` reads apart from `generate-plan`
 * in Workers Logs.
 */
const llmCallLogger: Telemetry = {
  onStart(event) {
    // `instructions` narrows the operation union to text generation, the only
    // shape `getAgentRuntime` produces. Object, embedding and rerank calls,
    // were any added, would be someone else's line to design.
    if (!('instructions' in event)) return;

    // Settled entries are kept only until the next call starts, which is long
    // enough for a post-response parse failure and short enough that the map
    // stays the size of the calls actually in flight.
    for (const [callId, call] of pending) {
      if (call.settled) pending.delete(callId);
    }

    pending.set(event.callId, {
      callSite: event.functionId ?? 'unlabelled',
      provider: event.provider,
      model: event.modelId,
      // The prompt as the SDK normalised it, which is what went over the wire —
      // `system` arrives here as `instructions`.
      prompt: { instructions: event.instructions, messages: event.messages },
      startedAt: Date.now(),
      settled: false,
    });
  },

  onEnd(event) {
    const started = pending.get(event.callId);
    if (started === undefined || !('finalStep' in event)) return;
    started.settled = true;

    const prompt = cap(started.prompt);
    const output = cap(event.text);

    emit({
      event: 'llm_call',
      // The SDK's id, unique per `generateText` call: a step that retries twice
      // emits three lines that differ here, so a retry is not mistaken for one
      // slow call.
      call_id: event.callId,
      call_site: started.callSite,
      status: 'ok',
      latency_ms: Date.now() - started.startedAt,
      provider: started.provider,
      model: started.model,
      prompt: prompt.value,
      prompt_chars: prompt.chars,
      output: output.value,
      output_chars: output.chars,
      // The cost data. Returned by the AI SDK on every call and, before this,
      // dropped on the floor.
      usage: event.usage,
      finish_reason: event.finishReason,
      response_id: event.finalStep.response.id,
      response_model_id: event.finalStep.response.modelId,
    });
  },

  onError(event) {
    const failure = readErrorEvent(event);
    if (failure === undefined) return;
    const { callId, error } = failure;

    const started = pending.get(callId);
    pending.delete(callId);

    const prompt = cap(started?.prompt);

    emit({
      event: 'llm_call',
      call_id: callId,
      call_site: started?.callSite ?? 'unlabelled',
      status: 'error',
      latency_ms: started === undefined ? undefined : Date.now() - started.startedAt,
      provider: started?.provider,
      model: started?.model,
      prompt: prompt.value,
      prompt_chars: prompt.chars,
      error: describeError(error),
    });
  },
};

let registered = false;

/**
 * `registerTelemetry` appends to a global without de-duplicating, and a second
 * registration would double every line. Idempotent so importers need not care
 * whether someone else got here first.
 */
export function registerLlmCallLogger(): void {
  if (registered) return;
  registered = true;
  registerTelemetry(llmCallLogger);
}
