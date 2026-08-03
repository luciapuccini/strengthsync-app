import { Hono, type Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import type { z } from 'zod'

import {
  PlanGenerationInputSchema,
  WeeklyProgressionInputSchema,
  type ApiError,
} from '@strengthsync/domain/contracts'

import type { WorkflowLauncher } from '../temporal/launcher.ts'

export type WorkflowApiDeps = {
  /** Shared only with apps/api; required on every /workflows/* request. */
  serviceSecret: string
  launcher: WorkflowLauncher
}

/**
 * Private workflow-start API (docs/operations/local_worker.md). Reached
 * only through the Cloudflare Tunnel by apps/api with the service secret;
 * never by the browser.
 */
export function createWorkflowApi(deps: WorkflowApiDeps): Hono {
  const app = new Hono()

  app.onError((err, c) => {
    console.error('[workflow-api] unhandled error', err)
    return c.json<ApiError>({ error: { code: 'internal_error', message: 'internal error' } }, 500)
  })

  app.get('/health', (c) => c.json({ ok: true }))
  app.use('/workflows/*', serviceSecretAuth(deps.serviceSecret))

  app.post('/workflows/weekly-progression', async (c) => {
    const input = await parseBody(c, WeeklyProgressionInputSchema)
    if (input instanceof Response) return input
    const result = await deps.launcher.startWeeklyProgression(input)
    return c.json({ workflow_id: result.workflowId, status: 'running' as const }, 202)
  })

  app.post('/workflows/plan-generation', async (c) => {
    const input = await parseBody(c, PlanGenerationInputSchema)
    if (input instanceof Response) return input
    const result = await deps.launcher.startPlanGeneration(input)
    return c.json({ workflow_id: result.workflowId, status: 'running' as const }, 202)
  })

  app.get('/workflows/:workflowId', async (c) => {
    const status = await deps.launcher.getStatus(decodeURIComponent(c.req.param('workflowId')))
    if (!status) {
      return c.json<ApiError>(
        { error: { code: 'workflow_not_found', message: 'workflow not found' } },
        404,
      )
    }
    return c.json(status)
  })

  return app
}

async function parseBody<S extends z.ZodType>(c: Context, schema: S) {
  const raw = await c.req.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return c.json<ApiError>(
      { error: { code: 'invalid_input', message: issue?.message ?? 'request body failed validation' } },
      400,
    )
  }
  return parsed.data as z.output<S>
}

/** Constant-time-ish secret check: compares SHA-256 digests of both values. */
function serviceSecretAuth(serviceSecret: string) {
  return createMiddleware(async (c, next) => {
    const provided = c.req.header('x-service-secret') ?? ''
    const [providedDigest, expectedDigest] = await Promise.all([
      sha256Hex(provided),
      sha256Hex(serviceSecret),
    ])
    if (providedDigest !== expectedDigest) {
      return c.json<ApiError>(
        { error: { code: 'forbidden', message: 'invalid service credentials' } },
        403,
      )
    }
    await next()
  })
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
