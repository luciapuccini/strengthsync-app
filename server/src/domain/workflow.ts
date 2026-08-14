import { z } from 'zod';

import { PlanDaySchema } from './model/index.ts';

/**
 * Shapes exchanged between the plan-turnover workflow and persistence. These
 * are deliberately NOT HTTP contracts — no browser request carries them; the
 * workflow produces them from model output and hands them to a repository.
 *
 * They live under `domain/` rather than `workflows/` because
 * `db/repositories/plans.ts` consumes the activation command, and the import
 * boundary in `eslint.config.js` forbids `db/**` from reaching into
 * `workflows/**`.
 */

export const GeneratedPlanInputSchema = z.object({
  label: z.string().min(1),
  // A block is 4-8 weeks; applies to a first plan and to plan turnover alike.
  total_weeks: z.number().int().min(4).max(8),
  week_template: z.array(PlanDaySchema),
  // Required key (nullable) so OpenAI structured-output JSON Schema accepts it.
  rationale: z.string().nullable(),
});
export type GeneratedPlanInput = z.infer<typeof GeneratedPlanInputSchema>;

export const ActivateGeneratedPlanCommandSchema = z.object({
  workflow_id: z.string().min(1),
  plan: GeneratedPlanInputSchema,
});
export type ActivateGeneratedPlanCommand = z.infer<typeof ActivateGeneratedPlanCommandSchema>;
