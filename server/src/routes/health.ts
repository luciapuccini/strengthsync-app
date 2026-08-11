import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

import { json } from './shared.ts'

const HealthResponseSchema = z.object({ ok: z.boolean() }).openapi('HealthResponse')

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  summary: 'Liveness probe',
  // Unauthenticated: app.ts mounts basicAuth on /api/* only. Declared so the
  // document does not inherit the global basicAuth requirement for this route.
  security: [],
  responses: { 200: json('Service is alive', HealthResponseSchema) },
})

/** Liveness probe. Declared as a route so it appears in the generated document. */
export function healthRoutes(): OpenAPIHono {
  const app = new OpenAPIHono()
  app.openapi(healthRoute, (c) => c.json({ ok: true }, 200))
  return app
}
