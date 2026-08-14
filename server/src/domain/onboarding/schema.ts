import { z } from 'zod';

import { ISODateSchema } from '../model/index.ts';

/**
 * The onboarding questionnaire's answer schema.
 *
 * Only slice 002's content lives here: who the client is, their primary goal,
 * and how many days a week they can train. `issues/004-training-step.md` and
 * `issues/005-life-step.md` extend this schema with training and life-step
 * answers — this file grows, it does not get replaced.
 */

export const ONBOARDING_GOALS = ['lose_fat', 'build_muscle', 'get_stronger'] as const;
export const OnboardingGoalSchema = z.enum(ONBOARDING_GOALS);
export type OnboardingGoal = z.infer<typeof OnboardingGoalSchema>;

export const ONBOARDING_SEXES = ['male', 'female', 'other'] as const;
export const OnboardingSexSchema = z.enum(ONBOARDING_SEXES);
export type OnboardingSex = z.infer<typeof OnboardingSexSchema>;

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
  days_per_week: z.number().int().min(1).max(7),
});
export type OnboardingAnswers = z.infer<typeof OnboardingAnswersSchema>;
