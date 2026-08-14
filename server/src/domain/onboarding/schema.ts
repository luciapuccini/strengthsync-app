import { z } from 'zod';

import { ISODateSchema } from '../model/index.ts';

/**
 * The onboarding questionnaire's answer schema.
 *
 * Slices 002 and 004 live here: who the client is, their primary goal, and
 * how they train today. `issues/005-life-step.md` extends this schema with
 * life-step answers — this file grows, it does not get replaced.
 */

export const ONBOARDING_GOALS = ['lose_fat', 'build_muscle', 'get_stronger'] as const;
export const OnboardingGoalSchema = z.enum(ONBOARDING_GOALS);
export type OnboardingGoal = z.infer<typeof OnboardingGoalSchema>;

export const ONBOARDING_SEXES = ['male', 'female', 'other'] as const;
export const OnboardingSexSchema = z.enum(ONBOARDING_SEXES);
export type OnboardingSex = z.infer<typeof OnboardingSexSchema>;

export const ONBOARDING_EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const OnboardingExperienceSchema = z.enum(ONBOARDING_EXPERIENCE_LEVELS);
export type OnboardingExperience = z.infer<typeof OnboardingExperienceSchema>;

/**
 * The main lifts an experienced client can give a working weight for. A
 * fixed vocabulary rather than free text, so the mapper always knows which
 * `strength_loads` key each answer becomes.
 */
export const ONBOARDING_MAIN_LIFTS = [
  'squat',
  'bench_press',
  'deadlift',
  'overhead_press',
] as const;
export type OnboardingMainLift = (typeof ONBOARDING_MAIN_LIFTS)[number];

const liftWeightSchema = z.number().positive().max(500);

export const OnboardingAnswersSchema = z.object({
  sex: OnboardingSexSchema,
  age: z.number().int().min(13).max(100),
  height_cm: z.number().positive().max(250),
  weight_kg: z.number().positive().max(400),
  body_fat_percent: z.number().min(3).max(60).optional(),
  goal: OnboardingGoalSchema,
  target_date: ISODateSchema.optional(),
  target_weight_kg: z.number().positive().max(400).optional(),
  note: z.string().min(1).max(500).optional(),
  experience: OnboardingExperienceSchema,
  squat_kg: liftWeightSchema.optional(),
  bench_press_kg: liftWeightSchema.optional(),
  deadlift_kg: liftWeightSchema.optional(),
  overhead_press_kg: liftWeightSchema.optional(),
  days_per_week: z.number().int().min(1).max(7),
  // ISO week convention shared with `PlanDay.day_index`: 1 = Monday, 7 = Sunday.
  rest_day: z.number().int().min(1).max(7),
});
export type OnboardingAnswers = z.infer<typeof OnboardingAnswersSchema>;
