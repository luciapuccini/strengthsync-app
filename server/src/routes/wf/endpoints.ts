import { OpenAPIHono, createRoute } from '@hono/zod-openapi'

import type { Env } from '../../env.ts'
import { defaultHook } from '../../lib/validation-error.ts'
import { invalidInput, json, unauthorized } from '../shared.ts'

import { CompleteWeekInputSchema, CompleteWeekStartedSchema } from './schemas.ts'

const completeWeekRoute = createRoute({
  method: 'post',
  path: '/complete-week',
  summary: 'Complete a week for a client (starts the Cloudflare Workflow)',
  request: {
    body: { content: { 'application/json': { schema: CompleteWeekInputSchema } } },
  },
  responses: {
    200: json('Week completed workflow started', CompleteWeekStartedSchema),
    400: invalidInput,
    401: unauthorized,
  },
})

/**
 * Cloudflare Workers Workflow routes.
 *
 * Unlike the other areas this one needs the Worker bindings, so it is typed
 * with `Env`. The body used to be a bare `req.json<{ clientId: string }>()`
 * cast, meaning an absent or non-string clientId reached the workflow binding
 * unchecked; it is now validated like every other request.
 */
export function cfWorkflowRoutes(): OpenAPIHono<{ Bindings: Env }> {
  const app = new OpenAPIHono<{ Bindings: Env }>({ defaultHook })

  app.openapi(completeWeekRoute, async (c) => {
    const { clientId } = c.req.valid('json')
    const instance = await c.env.STRENGTHSYNC_WORKFLOW.create({ params: { clientId } })
    return c.json({ instanceId: instance.id, details: await instance.status() }, 200)
  })

  return app
}
