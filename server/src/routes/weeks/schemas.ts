import { z } from '@hono/zod-openapi'

import {
  DAY_TYPES,
  DayExerciseLogSchema,
  EXERCISE_FEEDBACKS,
  ExerciseLogSchema,
  PerformedSetSchema,
  WEEK_STATUSES,
  WeekDaySchema,
  WeekSchema,
} from '../../domain/model/index.ts'
import { uuidParam } from '../shared.ts'

/**
 * HTTP shapes for the weeks area. See `routes/clients/schemas.ts` for why
 * schemas are rebuilt here rather than named where they are defined.
 *
 * The leaf schemas below are registered as components even though only `Week`
 * references them directly: `client/src/api/types.ts` aliases each by name, so
 * the document has to emit them rather than inline them.
 */

export const DayTypeSchema = z.enum(DAY_TYPES).openapi('DayType')
export const WeekStatusSchema = z.enum(WEEK_STATUSES).openapi('WeekStatus')
export const ExerciseFeedbackSchema = z.enum(EXERCISE_FEEDBACKS).openapi('ExerciseFeedback')
const PerformedSet = z.object(PerformedSetSchema.shape).openapi('PerformedSet')
const ExerciseLog = z
  .object({ ...ExerciseLogSchema.shape, sets: z.array(PerformedSet) })
  .openapi('ExerciseLog')
const WeekDay = z
  .object({ ...WeekDaySchema.shape, type: DayTypeSchema, exercises: z.array(ExerciseLog) })
  .openapi('WeekDay')

const Week = z
  .object({ ...WeekSchema.shape, status: WeekStatusSchema, schedule: z.array(WeekDay) })
  .openapi('Week')

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

/** The same params without the athlete id, which /me takes from the session. */
export const MyDayParamsSchema = DayParamsSchema.omit({ clientId: true })

export const WeekListQuerySchema = z.object({
  status: WeekStatusSchema.optional().openapi({ param: { name: 'status', in: 'query' } }),
  // Left as a plain string to match today's behaviour: an unknown planId
  // filters to an empty list rather than 400ing.
  planId: z.string().optional().openapi({ param: { name: 'planId', in: 'query' } }),
})

const DayExerciseLog = z
  .object({
    ...DayExerciseLogSchema.shape,
    feedback: ExerciseFeedbackSchema.nullable(),
    sets: z.array(PerformedSet),
  })
  .openapi('DayExerciseLog')

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
