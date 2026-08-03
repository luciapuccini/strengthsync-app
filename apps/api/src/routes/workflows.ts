import { Hono, type Context } from 'hono'

import type { Db } from '@strengthsync/db'
import {
  StartPlanGenerationSchema,
  StartWeeklyProgressionSchema,
} from '@strengthsync/domain/contracts'

import { errorResponse } from '../lib/errors.ts'
import { requireClient } from '../lib/lookup.ts'
import { isResponse, parseBody, parseUuidParam } from '../lib/validate.ts'

const WORKFLOW_API_TIMEOUT_MS = 30_000

/** Connection details for the private workflow-start API behind the tunnel. */
export type WorkflowApiConfig = {
  baseUrl: string
  serviceSecret: string
  /** Injectable for tests. */
  fetchFn?: typeof fetch
}

/**
 * Async workflow start/status proxy (docs/architecture/api_contracts.md).
 * The API Worker validates the caller and forwards through the tunnel with
 * the service secret; it never waits for model output.
 */
export function workflowProxyRoutes(db: Db, config: WorkflowApiConfig | undefined): Hono {
  const app = new Hono()

  app.post('/clients/:clientId/workflows/weekly-progression', async (c) => {
    const clientId = parseUuidParam(c, c.req.param('clientId'), 'clientId')
    if (isResponse(clientId)) return clientId
    const client = await requireClient(db, c, clientId)
    if (isResponse(client)) return client
    const input = await parseBody(c, StartWeeklyProgressionSchema)
    if (isResponse(input)) return input
    return proxy(c, config, '/workflows/weekly-progression', {
      method: 'POST',
      body: { client_id: clientId, week_id: input.week_id },
    })
  })

  app.post('/clients/:clientId/workflows/plan-generation', async (c) => {
    const clientId = parseUuidParam(c, c.req.param('clientId'), 'clientId')
    if (isResponse(clientId)) return clientId
    const client = await requireClient(db, c, clientId)
    if (isResponse(client)) return client
    const input = await parseBody(c, StartPlanGenerationSchema)
    if (isResponse(input)) return input
    const body: { client_id: string; notes?: string } = { client_id: clientId }
    if (input.notes !== undefined) body.notes = input.notes
    return proxy(c, config, '/workflows/plan-generation', { method: 'POST', body })
  })

  app.get('/workflows/:workflowId', async (c) => {
    const workflowId = encodeURIComponent(c.req.param('workflowId'))
    return proxy(c, config, `/workflows/${workflowId}`, { method: 'GET' })
  })

  return app
}

async function proxy(
  c: Context,
  config: WorkflowApiConfig | undefined,
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
): Promise<Response> {
  if (!config) {
    return errorResponse(
      c,
      503,
      'workflow_api_not_configured',
      'the workflow-start API is not configured on this environment',
    )
  }
  const fetchFn = config.fetchFn ?? fetch
  let upstream: globalThis.Response
  try {
    upstream = await fetchFn(`${config.baseUrl}${path}`, {
      method: init.method,
      headers: {
        'content-type': 'application/json',
        'x-service-secret': config.serviceSecret,
      },
      body: init.body === undefined ? null : JSON.stringify(init.body),
      signal: AbortSignal.timeout(WORKFLOW_API_TIMEOUT_MS),
    })
  } catch (err) {
    console.error('[api] workflow proxy unreachable', {
      path,
      method: init.method,
      error: err instanceof Error ? err.message : String(err),
    })
    return errorResponse(c, 502, 'workflow_api_unreachable', 'the workflow-start API could not be reached')
  }
  const body: unknown = await upstream.json().catch(() => null)
  if (body === null) {
    console.error('[api] workflow proxy bad response', { path, method: init.method, status: upstream.status })
    return errorResponse(c, 502, 'workflow_api_bad_response', 'the workflow-start API returned an invalid response')
  }
  if (init.method === 'POST') {
    console.info('[api] workflow proxy', { path, status: upstream.status, body })
  }
  return new Response(JSON.stringify(body), {
    status: upstream.status,
    headers: { 'content-type': 'application/json' },
  })
}
