import { OpenAPIHono, createRoute } from '@hono/zod-openapi'

import { findPlanById, getActivePlan, getPlan, type Db } from '../../db/index.ts'

import type { SessionVariables } from '../../lib/session.ts'
import { defaultHook } from '../../lib/validation-error.ts'
import {
  ClientIdParamSchema,
  invalidInput,
  json,
  notFound,
  unauthorized,
} from '../shared.ts'

import { PlanIdParamSchema, PlanParamsSchema, PlanResponseSchema } from './schemas.ts'

const getActivePlanRoute = createRoute({
  method: 'get',
  path: '/clients/{clientId}/plans/active',
  summary: "Get the client's active plan",
  request: { params: ClientIdParamSchema },
  responses: {
    200: json('Plan found', PlanResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
})

const getPlanRoute = createRoute({
  method: 'get',
  path: '/clients/{clientId}/plans/{planId}',
  summary: 'Get a plan by id',
  request: { params: PlanParamsSchema },
  responses: {
    200: json('Plan found', PlanResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
})

const getMyActivePlanRoute = createRoute({
  method: 'get',
  path: '/me/plans/active',
  summary: "Get the signed-in client's active plan",
  responses: {
    200: json('Plan found', PlanResponseSchema),
    401: unauthorized,
    404: notFound,
  },
})

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
})

/**
 * Public plan read routes. Plan creation/activation is workflow-only in the
 * MVP: the browser never sends a plan document or activates a plan directly
 * (docs/architecture/api_contracts.md).
 *
 * The /me pair takes the athlete from the verified session — see the note in
 * `routes/clients/endpoints.ts` on why both shapes exist at once.
 */
export function planRoutes(db: Db): OpenAPIHono<{ Variables: SessionVariables }> {
  const app = new OpenAPIHono<{ Variables: SessionVariables }>({ defaultHook })

  app.openapi(getActivePlanRoute, async (c) => {
    const { clientId } = c.req.valid('param')
    const plan = await getActivePlan(db, clientId)
    if (!plan) {
      return c.json(
        {
          error: {
            code: 'active_plan_not_found',
            message: `client ${clientId} has no active plan`,
          },
        },
        404,
      )
    }
    return c.json({ plan }, 200)
  })

  app.openapi(getPlanRoute, async (c) => {
    const { clientId, planId } = c.req.valid('param')
    const plan = await getPlan(db, clientId)
    if (!plan) {
      return c.json(
        { error: { code: 'plan_not_found', message: `plan ${planId} not found` } },
        404,
      )
    }
    return c.json({ plan }, 200)
  })

  app.openapi(getMyActivePlanRoute, async (c) => {
    const plan = await getActivePlan(db, c.get('clientId'))
    if (!plan) {
      return c.json(
        { error: { code: 'active_plan_not_found', message: 'no active plan' } },
        404,
      )
    }
    return c.json({ plan }, 200)
  })

  // Unlike its /clients counterpart, this reads the plan the caller asked for:
  // see `findPlanById` in the plans repository on why the two differ.
  app.openapi(getMyPlanRoute, async (c) => {
    const { planId } = c.req.valid('param')
    const plan = await findPlanById(db, c.get('clientId'), planId)
    if (!plan) {
      return c.json(
        { error: { code: 'plan_not_found', message: `plan ${planId} not found` } },
        404,
      )
    }
    return c.json({ plan }, 200)
  })

  return app
}
