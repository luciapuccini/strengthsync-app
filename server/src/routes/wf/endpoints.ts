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

function turnoverInstanceId(clientId: string): string {
  return `turnover-${clientId}-${todayIso()}`;
}
export function cfWorkflowRoutes(): OpenAPIHono<{ Bindings: Env; Variables: AuthVariables }> {
  const app = new OpenAPIHono<{ Bindings: Env; Variables: AuthVariables }>({ defaultHook });

  app.openapi(completeWeekRoute, async (c) => {
    const clientId = c.get('clientId');
    const id = turnoverInstanceId(clientId);
    try {
      const instance = await c.env.STRENGTHSYNC_WORKFLOW.create({ id, params: { clientId } });
      return c.json({ instanceId: id, status: (await instance.status()).status }, 200);
    } catch (error) {
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
