import { z } from '@hono/zod-openapi';

import {
  DAY_TYPES,
  DayExerciseLogSchema,
  EXERCISE_FEEDBACKS,
  ExerciseLogSchema,
  PerformedSetSchema,
  WEEK_STATUSES,
  WeekDaySchema,
  WeekSchema,
} from '../../domain/model/index.ts';
import { uuidParam } from '../shared.ts';

export const DayTypeSchema = z.enum(DAY_TYPES).openapi('DayType');
export const WeekStatusSchema = z.enum(WEEK_STATUSES).openapi('WeekStatus');
export const ExerciseFeedbackSchema = z.enum(EXERCISE_FEEDBACKS).openapi('ExerciseFeedback');
const PerformedSet = z.object(PerformedSetSchema.shape).openapi('PerformedSet');
const ExerciseLog = z
  .object({ ...ExerciseLogSchema.shape, sets: z.array(PerformedSet) })
  .openapi('ExerciseLog');
const WeekDay = z
  .object({ ...WeekDaySchema.shape, type: DayTypeSchema, exercises: z.array(ExerciseLog) })
  .openapi('WeekDay');

export const Week = z
  .object({ ...WeekSchema.shape, status: WeekStatusSchema, schedule: z.array(WeekDay) })
  .openapi('Week');

export const WeekResponseSchema = z.object({ week: Week }).openapi('WeekResponse');
export const WeekListResponseSchema = z
  .object({ weeks: z.array(Week) })
  .openapi('WeekListResponse');

export const DayParamsSchema = z.object({
  weekId: uuidParam('weekId'),
  dayIndex: z.coerce
    .number()
    .int()
    .min(1)
    .max(7)
    .openapi({ param: { name: 'dayIndex', in: 'path' } }),
});

export const WeekListQuerySchema = z.object({
  status: WeekStatusSchema.optional().openapi({ param: { name: 'status', in: 'query' } }),
  planId: z
    .string()
    .optional()
    .openapi({ param: { name: 'planId', in: 'query' } }),
});

const DayExerciseLog = z
  .object({
    ...DayExerciseLogSchema.shape,
    feedback: ExerciseFeedbackSchema.nullable(),
    sets: z.array(PerformedSet),
  })
  .openapi('DayExerciseLog');

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
      });
    }
  }
}

export const UpdateDayLogSchema = z
  .object({ completed: z.boolean(), exercises: z.array(DayExerciseLog) })
  .superRefine(refineSkippedExercisesHaveEmptySets)
  .openapi('UpdateDayLog');

export const SaveDayLogSchema = z
  .object({ exercises: z.array(DayExerciseLog) })
  .superRefine(refineSkippedExercisesHaveEmptySets)
  .openapi('SaveDayLog');
