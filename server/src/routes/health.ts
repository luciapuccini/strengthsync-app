import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

import { json } from './shared.ts';

const HealthResponseSchema = z.object({ ok: z.boolean() }).openapi('HealthResponse');

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  summary: 'Liveness probe',
  security: [],
  responses: { 200: json('Service is alive', HealthResponseSchema) },
});

export function healthRoutes(): OpenAPIHono {
  const app = new OpenAPIHono();
  app.openapi(healthRoute, (c) => c.json({ ok: true }, 200));
  return app;
}
