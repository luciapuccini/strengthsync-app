import { OpenAPIHono, createRoute } from '@hono/zod-openapi'

import { getActivePlan, getPlan, type Db } from '../../db/index.ts'

import { defaultHook } from '../../lib/validation-error.ts'
import {
  ClientIdParamSchema,
  invalidInput,
  json,
  notFound,
  unauthorized,
} from '../shared.ts'

import { PlanParamsSchema, PlanResponseSchema } from './schemas.ts'

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

/**
 * Public plan read routes. Plan creation/activation is workflow-only in the
 * MVP: the browser never sends a plan document or activates a plan directly
 * (docs/architecture/api_contracts.md).
 */
export function planRoutes(db: Db): OpenAPIHono {
  const app = new OpenAPIHono({ defaultHook })

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

  return app
}
