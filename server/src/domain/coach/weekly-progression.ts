import { z } from 'zod';

import { WeekDaySchema } from '../model/index.ts';

/**
 * LLM output schemas for weekly progression. Prompts are built inline by the
 * Cloudflare Workflow in server/src/workflows.
 */

export const WeekAnalysisSchema = z.object({
  analysis: z.string().min(1),
});
export type WeekAnalysis = z.infer<typeof WeekAnalysisSchema>;

/** Fresh next-week schedule: seven dated days with empty performance logs. */
export const NextWeekScheduleSchema = z.object({
  schedule: z.array(WeekDaySchema).superRefine((days, ctx) => {
    const indexes = days.map((d) => d.day_index).sort((a, b) => a - b);
    const expected = [1, 2, 3, 4, 5, 6, 7];
    if (indexes.length !== 7 || indexes.some((v, i) => v !== expected[i])) {
      ctx.addIssue({
        code: 'custom',
        message: 'schedule must include every day_index from 1 to 7 exactly once',
      });
    }
    for (const day of days) {
      if (day.completed || day.completed_at !== null) {
        ctx.addIssue({
          code: 'custom',
          message: `day ${day.day_index} must be incomplete (completed=false, completed_at=null)`,
        });
      }
      for (const exercise of day.exercises) {
        if (exercise.sets.length > 0 || exercise.skipped || exercise.feedback !== null) {
          ctx.addIssue({
            code: 'custom',
            message: `day ${day.day_index} exercise ${exercise.exercise_key} must have empty logs`,
          });
        }
      }
    }
  }),
});
export type NextWeekSchedule = z.infer<typeof NextWeekScheduleSchema>;
