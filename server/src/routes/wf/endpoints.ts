import { OpenAPIHono, createRoute } from '@hono/zod-openapi';

import { todayIso } from '../../db/index.ts';
import type { Env } from '../../env.ts';
import type { AuthVariables } from '../../lib/auth.ts';
import { defaultHook } from '../../lib/validation-error.ts';
import { json, notFound, unauthorized } from '../shared.ts';

import { CompleteWeekStartedSchema, TurnoverStatusSchema } from './schemas.ts';

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

const turnoverStatusRoute = createRoute({
  method: 'get',
  path: '/wf/complete-week/status',
  summary: "Status of the signed-in client's week turnover for today",
  responses: {
    200: json('Turnover status', TurnoverStatusSchema),
    401: unauthorized,
    404: notFound,
  },
});

/**
 * The instance id both routes derive. See `docs/architecture/workflows.md`.
 *
 * warning: the key is scoped to one UTC day, so a run started before UTC
 * midnight cannot be read back after it, and the screen falls back to idle.
 * Upgrade path: write the instance id on the week row and read it from there.
 */
function turnoverInstanceId(clientId: string): string {
  return `turnover-${clientId}-${todayIso()}`;
}

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
    const id = turnoverInstanceId(clientId);
    try {
      const instance = await c.env.STRENGTHSYNC_WORKFLOW.create({ id, params: { clientId } });
      return c.json({ instanceId: id, status: (await instance.status()).status }, 200);
    } catch (error) {
      // The id is already taken, which is the point of deriving it: the run is
      // under way, so report it instead of starting a second one. Anything the
      // platform refused for another reason has no instance to find here.
      const running = await c.env.STRENGTHSYNC_WORKFLOW.get(id).catch(() => null);
      if (!running) throw error;
      return c.json({ instanceId: id, status: (await running.status()).status }, 200);
    }
  });

  app.openapi(turnoverStatusRoute, async (c) => {
    const id = turnoverInstanceId(c.get('clientId'));
    const instance = await c.env.STRENGTHSYNC_WORKFLOW.get(id).catch(() => null);
    if (!instance) {
      return c.json({ error: { code: 'turnover_not_found', message: 'no turnover today' } }, 404);
    }
    return c.json({ status: (await instance.status()).status }, 200);
  });

  return app;
}
