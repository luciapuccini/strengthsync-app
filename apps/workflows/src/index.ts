import type { LlmCallRecorder } from '@strengthsync/agent'
import type { WorkflowLlmStep } from '@strengthsync/domain/coach'

/**
 * Placeholder proving the workflows → { domain, agent } edges.
 * Temporal worker, activities, private start API, Braintrust recorder,
 * and evals arrive with the workflow-runtime milestone.
 * See docs/architecture/workflows.md.
 */
export type WorkflowDefinitionPreview = {
  name: 'weekly_progression' | 'plan_generation'
  steps: WorkflowLlmStep[]
  requiresRecorder: true
}

/**
 * Production configuration fails fast when no recorder is supplied:
 * every workflow LLM call must be traced. See docs/architecture/evals.md.
 */
export function assertRecorder(recorder: LlmCallRecorder | null): LlmCallRecorder {
  if (!recorder) {
    throw new Error('Every workflow LLM activity requires an LlmCallRecorder')
  }
  return recorder
}
