import { z } from '@hono/zod-openapi'

import { DayExerciseLogSchema, WEEK_STATUSES, WeekSchema } from '../../domain/model/index.ts'
import { uuidParam } from '../shared.ts'

/**
 * HTTP shapes for the weeks area. See `routes/clients/schemas.ts` for why
 * schemas are rebuilt here rather than named where they are defined.
 */

const Week = z.object(WeekSchema.shape).openapi('Week')

export const WeekResponseSchema = z.object({ week: Week }).openapi('WeekResponse')
export const WeekListResponseSchema = z
  .object({ weeks: z.array(Week) })
  .openapi('WeekListResponse')

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

const DayExerciseLog = z.object(DayExerciseLogSchema.shape).openapi('DayExerciseLog')

/**
 * A skipped exercise was not performed, so it cannot carry performed sets.
 * Cross-field rules have no JSON Schema representation, so this does not appear
 * in the generated document — it runs server-side on every request.
 */
function refineSkippedExercisesHaveEmptySets(
  log: { exercises: Array<{ exercise_key: string; skipped: boolean; sets: unknown[] }> },
  ctx: z.RefinementCtx,
): void {
  for (const exercise of log.exercises) {
    if (exercise.skipped && exercise.sets.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `exercise ${exercise.exercise_key}: a skipped exercise must have empty sets`,
        path: ['exercises'],
      })
    }
  }
}

// Declared field-by-field rather than rebuilt from the domain write shape, so
// both day-log bodies reference the *named* DayExerciseLog component. Assigning
// the parsed result to the repository's `DayLogPatch` is what keeps the two in
// step — a divergence is a typecheck failure at the call site.
export const UpdateDayLogSchema = z
  .object({ completed: z.boolean(), exercises: z.array(DayExerciseLog) })
  .superRefine(refineSkippedExercisesHaveEmptySets)
  .openapi('UpdateDayLog')

/** Athlete save: exercise logs only; the server sets `completed`. */
export const SaveDayLogSchema = z
  .object({ exercises: z.array(DayExerciseLog) })
  .superRefine(refineSkippedExercisesHaveEmptySets)
  .openapi('SaveDayLog')
