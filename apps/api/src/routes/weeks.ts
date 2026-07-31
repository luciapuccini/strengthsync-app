import { Hono, type Context } from 'hono'

import { getCurrentWeek, getWeek, listWeeks, saveDay, updateDayLog, type Db } from '@strengthsync/db'
import { SaveDayLogSchema, UpdateDayLogSchema } from '@strengthsync/domain/contracts'
import { WeekStatusSchema, type WeekStatus } from '@strengthsync/domain/model'

import { errorResponse, repoErrorResponse } from '../lib/errors.ts'
import { requireClient } from '../lib/lookup.ts'
import { isResponse, parseBody, parseUuidParam } from '../lib/validate.ts'

type WeekFilter = { status?: WeekStatus; planId?: string }

function parseWeekFilter(c: Context): WeekFilter | Response {
  const filter: WeekFilter = {}
  const status = c.req.query('status')
  if (status !== undefined) {
    const parsed = WeekStatusSchema.safeParse(status)
    if (!parsed.success) {
      return errorResponse(
        c,
        400,
        'invalid_input',
        `status must be one of: ${WeekStatusSchema.options.join(', ')}`,
      )
    }
    filter.status = parsed.data
  }
  const planId = c.req.query('planId')
  if (planId !== undefined) filter.planId = planId
  return filter
}

/** Public week read routes + the single-day log patch. */
export function weekRoutes(db: Db): Hono {
  const app = new Hono()

  app.get('/clients/:clientId/weeks/current', async (c) => {
    const clientId = parseUuidParam(c, c.req.param('clientId'), 'clientId')
    if (isResponse(clientId)) return clientId
    const week = await getCurrentWeek(db, clientId)
    if (!week) {
      return errorResponse(c, 404, 'current_week_not_found', `client ${clientId} has no in_flight week`)
    }
    return c.json({ week })
  })

  app.get('/clients/:clientId/weeks', async (c) => {
    const clientId = parseUuidParam(c, c.req.param('clientId'), 'clientId')
    if (isResponse(clientId)) return clientId
    const client = await requireClient(db, c, clientId)
    if (isResponse(client)) return client
    const filter = parseWeekFilter(c)
    if (isResponse(filter)) return filter
    return c.json({ weeks: await listWeeks(db, clientId, filter) })
  })

  app.get('/clients/:clientId/weeks/:weekId', async (c) => {
    const clientId = parseUuidParam(c, c.req.param('clientId'), 'clientId')
    if (isResponse(clientId)) return clientId
    const weekId = parseUuidParam(c, c.req.param('weekId'), 'weekId')
    if (isResponse(weekId)) return weekId
    const week = await getWeek(db, clientId, weekId)
    if (!week) {
      return errorResponse(c, 404, 'week_not_found', `week ${weekId} not found`)
    }
    return c.json({ week })
  })

  app.patch('/clients/:clientId/weeks/:weekId/days/:dayIndex', async (c) => {
    const clientId = parseUuidParam(c, c.req.param('clientId'), 'clientId')
    if (isResponse(clientId)) return clientId
    const weekId = parseUuidParam(c, c.req.param('weekId'), 'weekId')
    if (isResponse(weekId)) return weekId
    const dayIndex = Number(c.req.param('dayIndex'))
    if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > 7) {
      return errorResponse(c, 400, 'invalid_input', 'dayIndex must be an integer between 1 and 7')
    }
    const input = await parseBody(c, UpdateDayLogSchema)
    if (isResponse(input)) return input
    try {
      const week = await updateDayLog(db, clientId, weekId, dayIndex, input)
      return c.json({ week })
    } catch (err) {
      return repoErrorResponse(c, err)
    }
  })

  app.post('/clients/:clientId/weeks/:weekId/days/:dayIndex/save', async (c) => {
    const clientId = parseUuidParam(c, c.req.param('clientId'), 'clientId')
    if (isResponse(clientId)) return clientId
    const weekId = parseUuidParam(c, c.req.param('weekId'), 'weekId')
    if (isResponse(weekId)) return weekId
    const dayIndex = Number(c.req.param('dayIndex'))
    if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > 7) {
      return errorResponse(c, 400, 'invalid_input', 'dayIndex must be an integer between 1 and 7')
    }
    const input = await parseBody(c, SaveDayLogSchema)
    if (isResponse(input)) return input
    try {
      const week = await saveDay(db, clientId, weekId, dayIndex, input)
      return c.json({ week })
    } catch (err) {
      return repoErrorResponse(c, err)
    }
  })

  return app
}
