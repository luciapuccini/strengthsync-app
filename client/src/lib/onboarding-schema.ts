import { z } from 'zod';

/**
 * UI-local schemas for the onboarding questionnaire, one per wizard step.
 *
 * Deliberately NOT the wire contract, same convention as `week-draft-schema.ts`:
 * its job is per-step validation before the wizard advances. The wire shape is
 * enforced by the server and typed on the client via `api/openapi.d.ts`. Fields
 * mirror `server/src/domain/onboarding/schema.ts` — keep the two in step.
 */

export const ONBOARDING_SEXES = ['male', 'female', 'other'] as const;
export const ONBOARDING_GOALS = ['lose_fat', 'build_muscle', 'get_stronger'] as const;
export const ONBOARDING_EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type OnboardingExperience = (typeof ONBOARDING_EXPERIENCE_LEVELS)[number];
export const ONBOARDING_MAIN_LIFTS = [
  'squat',
  'bench_press',
  'deadlift',
  'overhead_press',
] as const;
export const ONBOARDING_DAILY_ACTIVITY_LEVELS = [
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
] as const;
export const ONBOARDING_EATING_PHASES = ['deficit', 'maintenance', 'surplus'] as const;
export const ONBOARDING_WEEKDAYS = [
  { day_index: 1, label: 'Monday' },
  { day_index: 2, label: 'Tuesday' },
  { day_index: 3, label: 'Wednesday' },
  { day_index: 4, label: 'Thursday' },
  { day_index: 5, label: 'Friday' },
  { day_index: 6, label: 'Saturday' },
  { day_index: 7, label: 'Sunday' },
] as const;

/** `FormData.get` returns `""` for an empty number input, not `null`. */
export function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function optionalText(value: FormDataEntryValue | null): string | undefined {
  if (value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}

export const PersonalStepSchema = z.object({
  sex: z.enum(ONBOARDING_SEXES),
  age: z.number().int().min(13).max(100),
  height_cm: z.number().positive().max(250),
  weight_kg: z.number().positive().max(400),
  body_fat_percent: z.number().min(3).max(60).optional(),
});
export type PersonalStepAnswers = z.infer<typeof PersonalStepSchema>;

export const GoalStepSchema = z.object({
  goal: z.enum(ONBOARDING_GOALS),
  target_date: z.string().date().optional(),
  target_weight_kg: z.number().positive().max(400).optional(),
  note: z.string().min(1).max(500).optional(),
});
export type GoalStepAnswers = z.infer<typeof GoalStepSchema>;

const liftWeightSchema = z.number().positive().max(500);

export const TrainingStepSchema = z.object({
  experience: z.enum(ONBOARDING_EXPERIENCE_LEVELS),
  squat_kg: liftWeightSchema.optional(),
  bench_press_kg: liftWeightSchema.optional(),
  deadlift_kg: liftWeightSchema.optional(),
  overhead_press_kg: liftWeightSchema.optional(),
  days_per_week: z.number().int().min(1).max(7),
  rest_day: z.number().int().min(1).max(7),
});
export type TrainingStepAnswers = z.infer<typeof TrainingStepSchema>;

export const OnboardingActivitySchema = z.object({
  name: z.string().min(1).max(100),
  sessions_per_week: z.number().int().min(1).max(7),
  note: z.string().min(1).max(500).optional(),
});
export type OnboardingActivity = z.infer<typeof OnboardingActivitySchema>;

export const LifeStepSchema = z.object({
  activities: z.array(OnboardingActivitySchema).max(10).optional(),
  daily_activity_level: z.enum(ONBOARDING_DAILY_ACTIVITY_LEVELS).optional(),
  eating_phase: z.enum(ONBOARDING_EATING_PHASES).optional(),
  protein_target_g: z.number().int().positive().max(400).optional(),
  injury_note: z.string().min(1).max(1000).optional(),
});
export type LifeStepAnswers = z.infer<typeof LifeStepSchema>;

export const OnboardingAnswersSchema = PersonalStepSchema.extend(GoalStepSchema.shape)
  .extend(TrainingStepSchema.shape)
  .extend(LifeStepSchema.shape);
/** The full, validated questionnaire payload — same shape as the wire contract. */
export type OnboardingAnswers = z.infer<typeof OnboardingAnswersSchema>;

export type OnboardingDraft = Partial<OnboardingAnswers>;

/** Field-level messages keyed by schema field name, for one step's form. */
export type StepFieldErrors = Record<string, string>;

export function fieldErrors(error: z.ZodError): StepFieldErrors {
  const errors: StepFieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0]);
    errors[field] ??= issue.message;
  }
  return errors;
}
