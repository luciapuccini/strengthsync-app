import type { LlmCallRecorder } from '@strengthsync/agent'

import { BRAINTRUST_API_KEY, BRAINTRUST_PROJECT } from '../config.ts'
import { createBraintrustRecorder } from './braintrust-recorder.ts'

/**
 * Console recorder for unit tests and local runs without BRAINTRUST_API_KEY.
 * Logs metadata only — never validated input/output payloads.
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

/**
 * Production path: Braintrust when configured, otherwise console.
 * See docs/architecture/evals.md.
 */
export function createLlmRecorder(): LlmCallRecorder {
  if (BRAINTRUST_API_KEY) {
    return createBraintrustRecorder({
      apiKey: BRAINTRUST_API_KEY,
      projectName: BRAINTRUST_PROJECT,
    })
  }
  return createConsoleRecorder()
}
