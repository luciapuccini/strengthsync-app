import { OpenAPIHono, createRoute } from '@hono/zod-openapi';

import { findPlanById, getActivePlan, type Db } from '../../db/index.ts';

import type { SessionVariables } from '../../lib/session.ts';
import { defaultHook } from '../../lib/validation-error.ts';
import { invalidInput, json, notFound, unauthorized } from '../shared.ts';

import { PlanIdParamSchema, PlanResponseSchema } from './schemas.ts';

const getMyActivePlanRoute = createRoute({
  method: 'get',
  path: '/me/plans/active',
  summary: "Get the signed-in client's active plan",
  responses: {
    200: json('Plan found', PlanResponseSchema),
    401: unauthorized,
    404: notFound,
  },
});

const getMyPlanRoute = createRoute({
  method: 'get',
  path: '/me/plans/{planId}',
  summary: "Get one of the signed-in client's plans by id",
  request: { params: PlanIdParamSchema },
  responses: {
    200: json('Plan found', PlanResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
});

/**
 * Public plan read routes. Plan creation/activation is workflow-only in the
 * MVP: the browser never sends a plan document or activates a plan directly
 * (docs/architecture/api_contracts.md).
 *
 * Both take the athlete from the verified session — see the note in
 * `routes/clients/endpoints.ts`.
 */
export function planRoutes(db: Db): OpenAPIHono<{ Variables: SessionVariables }> {
  const app = new OpenAPIHono<{ Variables: SessionVariables }>({ defaultHook });

  app.openapi(getMyActivePlanRoute, async (c) => {
    const plan = await getActivePlan(db, c.get('clientId'));
    if (!plan) {
      return c.json({ error: { code: 'active_plan_not_found', message: 'no active plan' } }, 404);
    }
    return c.json({ plan }, 200);
  });

  // Scoped to the caller, so naming someone else's plan id finds nothing
  // rather than reading it.
  app.openapi(getMyPlanRoute, async (c) => {
    const { planId } = c.req.valid('param');
    const plan = await findPlanById(db, c.get('clientId'), planId);
    if (!plan) {
      return c.json(
        { error: { code: 'plan_not_found', message: `plan ${planId} not found` } },
        404,
      );
    }
    return c.json({ plan }, 200);
  });

  return app;
}
