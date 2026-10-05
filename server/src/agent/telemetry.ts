import { registerTelemetry, type Telemetry } from 'ai';

const MAX_LOGGED_CHARS = 16_000;

type PendingCall = {
  callSite: string;
  provider: string;
  model: string;
  prompt: unknown;
  startedAt: number;
  settled: boolean;
};

const pending = new Map<string, PendingCall>();

type Capped = { value: unknown; chars: number };

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

function emit(line: Record<string, unknown>): void {
  try {
    console.log(JSON.stringify(line));
  } catch {
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

function readErrorEvent(event: unknown): { callId: string; error: unknown } | undefined {
  if (typeof event !== 'object' || event === null || !('callId' in event)) return undefined;
  const { callId, error } = event as { callId: unknown; error?: unknown };
  return typeof callId === 'string' ? { callId, error } : undefined;
}

const llmCallLogger: Telemetry = {
  onStart(event) {
    if (!('instructions' in event)) return;

    for (const [callId, call] of pending) {
      if (call.settled) pending.delete(callId);
    }

    pending.set(event.callId, {
      callSite: event.functionId ?? 'unlabelled',
      provider: event.provider,
      model: event.modelId,
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

export function registerLlmCallLogger(): void {
  if (registered) return;
  registered = true;
  registerTelemetry(llmCallLogger);
}
