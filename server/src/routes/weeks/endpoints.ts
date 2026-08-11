import { OpenAPIHono, createRoute } from '@hono/zod-openapi'

import {
  getClient,
  getCurrentWeek,
  listWeeks,
  saveDay,
  updateDayLog,
  type Db,
} from '../../db/index.ts'
import { SaveDayLogSchema, UpdateDayLogSchema } from '../../domain/contracts/index.ts'
import type { WeekStatus } from '../../domain/model/index.ts'

import { defaultHook } from '../../lib/validation-error.ts'
import { ApiErrorSchema } from '../clients/schemas.ts'

import {
  ClientIdParamSchema,
  DayParamsSchema,
  WeekListQuerySchema,
  WeekListResponseSchema,
  WeekResponseSchema,
} from './schemas.ts'

const json = <S>(description: string, schema: S) => ({
  description,
  content: { 'application/json': { schema } },
})

const unauthorized = json('Missing or invalid credentials', ApiErrorSchema)
const invalidInput = json('Invalid input', ApiErrorSchema)
const notFound = json('Not found', ApiErrorSchema)

const getCurrentWeekRoute = createRoute({
  method: 'get',
  path: '/clients/{clientId}/weeks/current',
  summary: "Get the client's current in-flight week",
  request: { params: ClientIdParamSchema },
  responses: {
    200: json('Week found', WeekResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
})

const listWeeksRoute = createRoute({
  method: 'get',
  path: '/clients/{clientId}/weeks',
  summary: 'List weeks for a client',
  request: { params: ClientIdParamSchema, query: WeekListQuerySchema },
  responses: {
    200: json('Weeks found', WeekListResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
})

const saveDayLogRoute = createRoute({
  method: 'post',
  path: '/clients/{clientId}/weeks/{weekId}/days/{dayIndex}/save',
  summary: "Save a day's exercise logs and mark the day completed",
  request: {
    params: DayParamsSchema,
    body: { content: { 'application/json': { schema: SaveDayLogSchema } } },
  },
  responses: {
    200: json('Day saved', WeekResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
})

const updateDayLogRoute = createRoute({
  method: 'patch',
  path: '/clients/{clientId}/weeks/{weekId}/days/{dayIndex}',
  summary: 'Low-level day log patch (tests/tools)',
  request: {
    params: DayParamsSchema,
    body: { content: { 'application/json': { schema: UpdateDayLogSchema } } },
  },
  responses: {
    200: json('Day patched', WeekResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
})

/**
 * Public week read routes + the day log writes.
 *
 * RepoError from the write paths propagates to app.ts's onError, which maps it
 * to the envelope — the local try/catch the imperative version needed is gone.
 */
export function weekRoutes(db: Db): OpenAPIHono {
  const app = new OpenAPIHono({ defaultHook })

  app.openapi(getCurrentWeekRoute, async (c) => {
    const { clientId } = c.req.valid('param')
    const week = await getCurrentWeek(db, clientId)
    if (!week) {
      return c.json(
        {
          error: {
            code: 'current_week_not_found',
            message: `client ${clientId} has no in_flight week`,
          },
        },
        404,
      )
    }
    return c.json({ week }, 200)
  })

  app.openapi(listWeeksRoute, async (c) => {
    const { clientId } = c.req.valid('param')
    if (!(await getClient(db, clientId))) {
      return c.json(
        { error: { code: 'client_not_found', message: `client ${clientId} not found` } },
        404,
      )
    }
    const { status, planId } = c.req.valid('query')
    // Built conditionally rather than spread: exactOptionalPropertyTypes means
    // an explicit `undefined` is not assignable to an optional property.
    const filter: { status?: WeekStatus; planId?: string } = {}
    if (status !== undefined) filter.status = status
    if (planId !== undefined) filter.planId = planId
    return c.json({ weeks: await listWeeks(db, clientId, filter) }, 200)
  })

  app.openapi(saveDayLogRoute, async (c) => {
    const { clientId, weekId, dayIndex } = c.req.valid('param')
    const week = await saveDay(db, clientId, weekId, dayIndex, c.req.valid('json'))
    return c.json({ week }, 200)
  })

  app.openapi(updateDayLogRoute, async (c) => {
    const { clientId, weekId, dayIndex } = c.req.valid('param')
    const week = await updateDayLog(db, clientId, weekId, dayIndex, c.req.valid('json'))
    return c.json({ week }, 200)
  })

  return app
}
