import { z } from '@hono/zod-openapi'

import {
  PlanDaySchema,
  PlanSchema,
  PlannedExerciseSchema,
} from '../../domain/model/index.ts'
import { uuidParam } from '../shared.ts'
import { DayTypeSchema } from '../weeks/schemas.ts'

/**
 * HTTP shapes for the plans area. See `routes/clients/schemas.ts` on rebuilding.
 *
 * `PlannedExercise` and `PlanDay` are registered as components because
 * `client/src/api/types.ts` aliases them by name, not because a route returns
 * them directly.
 */

const PlannedExercise = z.object(PlannedExerciseSchema.shape).openapi('PlannedExercise')
const PlanDay = z
  .object({ ...PlanDaySchema.shape, type: DayTypeSchema, exercises: z.array(PlannedExercise) })
  .openapi('PlanDay')

const Plan = z
  .object({ ...PlanSchema.shape, week_template: z.array(PlanDay) })
  .openapi('Plan')

export const PlanResponseSchema = z.object({ plan: Plan }).openapi('PlanResponse')

export const PlanParamsSchema = z.object({
  clientId: uuidParam('clientId'),
  planId: uuidParam('planId'),
})
