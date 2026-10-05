import { z } from 'zod';

import { ISODateSchema } from '../model/index.ts';
import { snapLoad } from '../weight-grid.ts';

export const ONBOARDING_GOALS = ['lose_fat', 'build_muscle', 'get_stronger'] as const;
export const OnboardingGoalSchema = z.enum(ONBOARDING_GOALS);
export type OnboardingGoal = z.infer<typeof OnboardingGoalSchema>;

export const ONBOARDING_SEXES = ['male', 'female', 'other'] as const;
export const OnboardingSexSchema = z.enum(ONBOARDING_SEXES);
export type OnboardingSex = z.infer<typeof OnboardingSexSchema>;

export const ONBOARDING_EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const OnboardingExperienceSchema = z.enum(ONBOARDING_EXPERIENCE_LEVELS);
export type OnboardingExperience = z.infer<typeof OnboardingExperienceSchema>;

export const ONBOARDING_MAIN_LIFTS = [
  'squat',
  'bench_press',
  'deadlift',
  'overhead_press',
] as const;
export type OnboardingMainLift = (typeof ONBOARDING_MAIN_LIFTS)[number];

const liftWeightSchema = z.number().positive().max(1000).transform(snapLoad);

export const ONBOARDING_DAILY_ACTIVITY_LEVELS = [
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
] as const;
export const OnboardingDailyActivityLevelSchema = z.enum(ONBOARDING_DAILY_ACTIVITY_LEVELS);
export type OnboardingDailyActivityLevel = z.infer<typeof OnboardingDailyActivityLevelSchema>;

export const ONBOARDING_EATING_PHASES = ['deficit', 'maintenance', 'surplus'] as const;
export const OnboardingEatingPhaseSchema = z.enum(ONBOARDING_EATING_PHASES);
export type OnboardingEatingPhase = z.infer<typeof OnboardingEatingPhaseSchema>;

export const OnboardingActivitySchema = z.object({
  name: z.string().min(1).max(100),
  sessions_per_week: z.number().int().min(1).max(7),
  note: z.string().min(1).max(500).optional(),
});
export type OnboardingActivity = z.infer<typeof OnboardingActivitySchema>;

export const OnboardingAnswersSchema = z.object({
  sex: OnboardingSexSchema,
  age: z.number().int().min(13).max(100),
  height_in: z.number().positive().max(100),
  weight_lb: z.number().positive().max(800),
  body_fat_percent: z.number().min(3).max(60).optional(),
  goal: OnboardingGoalSchema,
  target_date: ISODateSchema.optional(),
  target_weight_lb: z.number().positive().max(800).optional(),
  note: z.string().min(1).max(500).optional(),
  experience: OnboardingExperienceSchema,
  squat_lb: liftWeightSchema.optional(),
  bench_press_lb: liftWeightSchema.optional(),
  deadlift_lb: liftWeightSchema.optional(),
  overhead_press_lb: liftWeightSchema.optional(),
  days_per_week: z.number().int().min(1).max(7),
  rest_day: z.number().int().min(1).max(7),
  activities: z.array(OnboardingActivitySchema).max(10).optional(),
  daily_activity_level: OnboardingDailyActivityLevelSchema.optional(),
  eating_phase: OnboardingEatingPhaseSchema.optional(),
  protein_target_g: z.number().int().positive().max(400).optional(),
  injury_note: z.string().min(1).max(1000).optional(),
});
export type OnboardingAnswers = z.infer<typeof OnboardingAnswersSchema>;
