/**
 * Single source of truth for Temporal/workflow-API configuration.
 * This is a plain Node.js process, so process.env is correct here.
 * Local dev loads ../../.dev.vars via the package scripts (dotenv-cli);
 * containers receive the same variables through .env.workflows
 * (docs/operations/local_worker.md).
 */

export const TASK_QUEUE = 'strengthsync'
export const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? 'default'
export const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233'
export const WORKFLOW_API_PORT = Number(process.env.WORKFLOW_API_PORT ?? 3001)

const TEMPORAL_API_KEY = process.env.TEMPORAL_API_KEY

// Temporal Cloud requires TLS + API key auth; the local dev server uses neither.
export const connectionOptions = {
  address: TEMPORAL_ADDRESS,
  ...(TEMPORAL_API_KEY ? { tls: true as const, apiKey: TEMPORAL_API_KEY } : {}),
}

export const connectionTarget = TEMPORAL_API_KEY
  ? `Temporal Cloud (${TEMPORAL_ADDRESS})`
  : `local dev server (${TEMPORAL_ADDRESS})`

/** apps/api internal data-command surface (used by activities in later milestones). */
export const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL ?? 'http://localhost:8787'
export const INTERNAL_API_SERVICE_SECRET = process.env.INTERNAL_API_SERVICE_SECRET ?? ''
