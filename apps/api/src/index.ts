import type { LlmCallRecorder } from '@strengthsync/agent'
import type { Db } from '@strengthsync/db'
import type { ApiError } from '@strengthsync/domain/contracts'

/**
 * Placeholder proving the api → { domain, agent, db } edges.
 * The Hono Cloudflare Worker (public REST, internal data commands, chat
 * routing, Basic Auth) is being built in the API boundary milestone.
 * See docs/architecture/api_contracts.md.
 */
export type HealthResponse = { ok: true }
export type HealthError = ApiError

export type ApiDataBoundary = {
  /** Repository database handle over the D1 binding. */
  db: Db
  /** Recorder forwarded to workflow LLM calls in later milestones. */
  llmRecorder: LlmCallRecorder
}

export function health(): HealthResponse {
  return { ok: true }
}
