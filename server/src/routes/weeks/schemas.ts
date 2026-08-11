import { z } from '@hono/zod-openapi'

import { WEEK_STATUSES, WeekSchema } from '../../domain/model/index.ts'

/**
 * HTTP shapes for the weeks area. See `routes/clients/schemas.ts` for why
 * schemas are rebuilt here rather than named where they are defined.
 *
 * `SaveDayLogSchema` / `UpdateDayLogSchema` are deliberately NOT rebuilt and
 * NOT named. In Zod 4 `.superRefine()` returns a ZodObject that still exposes
 * `.shape`, so `z.object(Schema.shape)` compiles, runs, and silently drops the
 * cross-field rule that a skipped exercise carries no sets. Those two are used
 * as-is for validation here and gain their component names in slice 005, where
 * they are defined in this file natively instead of imported.
 */

const Week = z.object(WeekSchema.shape).openapi('Week')

export const WeekResponseSchema = z.object({ week: Week }).openapi('WeekResponse')
export const WeekListResponseSchema = z
  .object({ weeks: z.array(Week) })
  .openapi('WeekListResponse')

const uuidParam = (name: string) => z.uuid().openapi({ param: { name, in: 'path' } })

export const ClientIdParamSchema = z.object({ clientId: uuidParam('clientId') })

export const DayParamsSchema = z.object({
  clientId: uuidParam('clientId'),
  weekId: uuidParam('weekId'),
  // Coerced because path params arrive as strings. A failure here is not a
  // malformed route id, so it stays `invalid_input` — see lib/validation-error.
  dayIndex: z.coerce
    .number()
    .int()
    .min(1)
    .max(7)
    .openapi({ param: { name: 'dayIndex', in: 'path' } }),
})

export const WeekListQuerySchema = z.object({
  status: z.enum(WEEK_STATUSES).optional().openapi({ param: { name: 'status', in: 'query' } }),
  // Left as a plain string to match today's behaviour: an unknown planId
  // filters to an empty list rather than 400ing.
  planId: z.string().optional().openapi({ param: { name: 'planId', in: 'query' } }),
})
