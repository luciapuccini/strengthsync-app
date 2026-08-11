import { z } from '@hono/zod-openapi'

import { PlanSchema } from '../../domain/model/index.ts'
import { uuidParam } from '../shared.ts'

/** HTTP shapes for the plans area. See `routes/clients/schemas.ts` on rebuilding. */

const Plan = z.object(PlanSchema.shape).openapi('Plan')

export const PlanResponseSchema = z.object({ plan: Plan }).openapi('PlanResponse')

export const PlanParamsSchema = z.object({
  clientId: uuidParam('clientId'),
  planId: uuidParam('planId'),
})
