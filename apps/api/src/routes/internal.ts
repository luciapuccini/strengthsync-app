import { Hono } from 'hono'

import {
  activateGeneratedPlan,
  completeWeek,
  createNextWeek,
  getPlanGenerationContext,
  getWeeklyContext,
  type Db,
} from '@strengthsync/db'
import {
  ActivateGeneratedPlanCommandSchema,
  CompleteWeekCommandSchema,
  CreateNextWeekCommandSchema,
} from '@strengthsync/domain/contracts'

import { errorResponse, repoErrorResponse } from '../lib/errors.ts'
import { isResponse, parseBody } from '../lib/validate.ts'

/**
 * Internal workflow-to-data commands (docs/architecture/api_contracts.md).
 * Reachable only by the local workflow worker with the service secret —
 * never by the browser. Commands are idempotent by `workflow_id`.
 */
export function internalRoutes(db: Db): Hono {
  const app = new Hono()

  app.get('/clients/:clientId/weekly-context', async (c) => {
    const weekId = c.req.query('weekId')
    if (!weekId) {
      return errorResponse(c, 400, 'invalid_input', 'weekId query parameter is required')
    }
    try {
      return c.json(await getWeeklyContext(db, c.req.param('clientId'), weekId))
    } catch (err) {
      return repoErrorResponse(c, err)
    }
  })

  app.post('/clients/:clientId/weeks/:weekId/complete', async (c) => {
    const command = await parseBody(c, CompleteWeekCommandSchema)
    if (isResponse(command)) return command
    try {
      const week = await completeWeek(db, c.req.param('clientId'), c.req.param('weekId'))
      console.info('[api] completeWeek', { week_id: week.id, workflow_id: command.workflow_id })
      return c.json({ week })
    } catch (err) {
      return repoErrorResponse(c, err)
    }
  })

  app.post('/clients/:clientId/weeks/next', async (c) => {
    const command = await parseBody(c, CreateNextWeekCommandSchema)
    if (isResponse(command)) return command
    try {
      const week = await createNextWeek(db, c.req.param('clientId'), command)
      console.info('[api] createNextWeek', {
        week_id: week.id,
        week_index: week.week_index,
        workflow_id: command.workflow_id,
      })
      return c.json({ week })
    } catch (err) {
      return repoErrorResponse(c, err)
    }
  })

  app.get('/clients/:clientId/plan-generation-context', async (c) => {
    try {
      return c.json(await getPlanGenerationContext(db, c.req.param('clientId')))
    } catch (err) {
      return repoErrorResponse(c, err)
    }
  })

  app.post('/clients/:clientId/plans/activate-generated', async (c) => {
    const command = await parseBody(c, ActivateGeneratedPlanCommandSchema)
    if (isResponse(command)) return command
    try {
      const result = await activateGeneratedPlan(db, c.req.param('clientId'), command)
      return c.json(result)
    } catch (err) {
      return repoErrorResponse(c, err)
    }
  })

  return app
}
