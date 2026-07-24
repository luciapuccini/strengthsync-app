import { initLogger } from 'braintrust'

import type { LlmCallRecorder } from '@strengthsync/agent'
import type { WorkflowLlmStep } from '@strengthsync/domain/coach'

export type BraintrustRecorderOptions = {
  apiKey: string
  projectName: string
}

type WorkflowType = 'weekly_progression' | 'plan_generation'

function workflowTypeFromStep(step: string): WorkflowType {
  if (
    step === 'analyze_week' ||
    step === 'generate_next_week'
  ) {
    return 'weekly_progression'
  }
  return 'plan_generation'
}

/**
 * Braintrust-backed LlmCallRecorder. Traces every successful or failed
 * workflow LLM call with validated input/output and workflow metadata.
 * Trace payloads stay in Braintrust — never in D1.
 */
export function createBraintrustRecorder(
  options: BraintrustRecorderOptions,
): LlmCallRecorder {
  const logger = initLogger({
    apiKey: options.apiKey,
    projectName: options.projectName,
  })

  return {
    record: async (input) => {
      const created_at = new Date().toISOString()
      const workflow_type = workflowTypeFromStep(input.step)
      const name = input.step as WorkflowLlmStep

      await logger.traced(
        async (span) => {
          span.log({
            input: input.input,
            output: input.output,
            error: input.error ?? undefined,
            metrics: { latency_ms: input.latency_ms },
            metadata: {
              workflow_id: input.workflow_id,
              workflow_type,
              client_id: input.client_id,
              step: input.step,
              model: input.model,
              tool_calls: [] as Array<{ name: string; input: unknown }>,
              created_at,
              error: input.error,
            },
          })
        },
        { name, type: 'llm' },
      )
    },
  }
}
