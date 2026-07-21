import type { LlmCallRecorder } from '@strengthsync/agent'
import type { WeekRowPreview } from '@strengthsync/db'
import type { ApiError } from '@strengthsync/domain/contracts'

/**
 * Placeholder proving the api → { domain, agent, db } edges.
 * The Hono Cloudflare Worker (public REST, internal data commands, chat
 * routing, Basic Auth) arrives with the API boundary milestone.
 * See docs/architecture/api_contracts.md.
 */
export type HealthResponse = { ok: true }
export type HealthError = ApiError

export type ApiDataBoundary = {
  /** Recorder forwarded to workflow LLM calls in later milestones. */
  llmRecorder: LlmCallRecorder
  /** Example of the db package's repository surface. */
  previewWeekRow: () => WeekRowPreview
}

export function health(): HealthResponse {
  return { ok: true }
}
