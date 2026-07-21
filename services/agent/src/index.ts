import type { WorkflowLlmStep } from '@strengthsync/domain/coach'

/**
 * Mandatory trace capture for every workflow LLM call, including failures.
 * `apps/workflows` supplies the Braintrust-backed implementation; agent
 * helpers must call it for every request. Traces go to the observability
 * provider — never to the product database.
 * See docs/architecture/monorepo_structure.md.
 */
export type LlmCallRecorder = {
  record(input: {
    /** Provider trace/workflow correlation; no product DB record is required. */
    workflow_id: string | null
    client_id: string
    step: string
    model: string
    input: unknown
    output: unknown | null
    error: string | null
    latency_ms: number
  }): Promise<void>
}

/**
 * Context every workflow LLM activity must provide alongside the recorder.
 * Production configuration fails fast when no recorder is supplied.
 */
export type WorkflowLlmContext = {
  workflow_id: string | null
  client_id: string
  step: WorkflowLlmStep
  recorder: LlmCallRecorder
}
