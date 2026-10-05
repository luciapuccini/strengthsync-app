import { z } from 'zod';

import { PlanDaySchema } from './model/index.ts';

export const GeneratedPlanInputSchema = z.object({
  label: z.string().min(1),
  total_weeks: z.number().int().min(4).max(8),
  week_template: z.array(PlanDaySchema),
  rationale: z.string().nullable(),
});
export type GeneratedPlanInput = z.infer<typeof GeneratedPlanInputSchema>;

export const ActivateGeneratedPlanCommandSchema = z.object({
  workflow_id: z.string().min(1),
  plan: GeneratedPlanInputSchema,
});
export type ActivateGeneratedPlanCommand = z.infer<typeof ActivateGeneratedPlanCommandSchema>;
