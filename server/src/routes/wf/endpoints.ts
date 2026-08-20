import { OpenAPIHono, createRoute } from '@hono/zod-openapi';

import type { Env } from '../../env.ts';
import type { AuthVariables } from '../../lib/auth.ts';
import { defaultHook } from '../../lib/validation-error.ts';
import { json, unauthorized } from '../shared.ts';

import { CompleteWeekStartedSchema } from './schemas.ts';

const completeWeekRoute = createRoute({
  method: 'post',
  path: '/wf/complete-week',
  summary: "Complete the signed-in client's week (starts the Cloudflare Workflow)",
  // No request body: the athlete comes from the session, and the workflow
  // needs nothing else the caller could supply. No 400 either — with nothing
  // left to validate there is no code path that could produce one, the same
  // standard that put the 401 below on every other guarded route.
  responses: {
    200: json('Week completed workflow started', CompleteWeekStartedSchema),
    401: unauthorized,
  },
});

/**
 * Cloudflare Workers Workflow routes.
 *
 * Unlike the other areas this one needs the Worker bindings, so it is typed
 * with `Env` in addition to the session `Variables` the guard in app.ts sets
 * before this router ever runs.
 */
export function cfWorkflowRoutes(): OpenAPIHono<{ Bindings: Env; Variables: AuthVariables }> {
  const app = new OpenAPIHono<{ Bindings: Env; Variables: AuthVariables }>({ defaultHook });

  app.openapi(completeWeekRoute, async (c) => {
    const clientId = c.get('clientId');
    const instance = await c.env.STRENGTHSYNC_WORKFLOW.create({ params: { clientId } });
    return c.json({ instanceId: instance.id, details: await instance.status() }, 200);
  });

  return app;
}
