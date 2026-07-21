/** Worker bindings + secrets (set via `wrangler secret` / .dev.vars). */
export type Env = {
  DB: D1Database
  BASIC_AUTH_USERNAME: string
  BASIC_AUTH_PASSWORD: string
  INTERNAL_API_SERVICE_SECRET: string
  WORKFLOW_API_URL?: string
  WORKFLOW_SERVICE_SECRET?: string
}
