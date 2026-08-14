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

export const TrainingDaysStepSchema = z.object({
  days_per_week: z.number().int().min(1).max(7),
});
export type TrainingDaysStepAnswers = z.infer<typeof TrainingDaysStepSchema>;

export const OnboardingAnswersSchema = PersonalStepSchema.extend(GoalStepSchema.shape).extend(
  TrainingDaysStepSchema.shape,
);
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
