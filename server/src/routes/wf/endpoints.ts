import { OpenAPIHono, createRoute } from '@hono/zod-openapi'

import type { Env } from '../../env.ts'
import { defaultHook } from '../../lib/validation-error.ts'
import { invalidInput, json } from '../shared.ts'

import { CompleteWeekInputSchema, CompleteWeekStartedSchema } from './schemas.ts'

const completeWeekRoute = createRoute({
  method: 'post',
  path: '/complete-week',
  summary: 'Complete a week for a client (starts the Cloudflare Workflow)',
  // Unauthenticated, like /health: app.ts guards /api/* only. Previously this
  // inherited the document's Basic requirement without ever being behind it —
  // declared now so the swap to the session scheme does not carry that forward.
  // The route being open at all is the known MVP gap in api_contracts.md.
  security: [],
  request: {
    body: { content: { 'application/json': { schema: CompleteWeekInputSchema } } },
  },
  // No 401. Nothing guards this path, so there is no code here or in app.ts
  // that could produce one — issue 009 corrected the `security` above and left
  // the response behind it, which left the contract promising a status the
  // route cannot return. A caller writing against it would have handled a case
  // that never arrives.
  responses: {
    200: json('Week completed workflow started', CompleteWeekStartedSchema),
    400: invalidInput,
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
