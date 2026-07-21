import type { LlmCallRecorder } from '@strengthsync/agent'

/**
 * The Braintrust-backed recorder arrives with the first LLM activity
 * (weekly-progression milestone; docs/architecture/evals.md). Until then
 * this console recorder keeps the injection contract exercised: every
 * workflow LLM call receives a recorder, including failures, and no LLM
 * trace data is written to the product database.
 */
export function createConsoleRecorder(): LlmCallRecorder {
  return {
    record: async (input) => {
      console.log(
        '[llm-trace]',
        JSON.stringify({
          workflow_id: input.workflow_id,
          client_id: input.client_id,
          step: input.step,
          model: input.model,
          error: input.error,
          latency_ms: input.latency_ms,
        }),
      )
    },
  }
}
