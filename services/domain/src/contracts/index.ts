import { z } from "zod";

import {
  ClientProfileSchema,
  ExerciseFeedbackSchema,
  PerformedSetSchema,
  PlanDaySchema,
} from "../model/index.ts";

/**
 * API request/response DTOs, validated by Zod on both sides of every API
 * boundary. Source of truth: docs/architecture/api_contracts.md.
 */

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};

// ---------------------------------------------------------------------------
// Public API — clients and profile
// ---------------------------------------------------------------------------

export const CreateClientInputSchema = z.object({
  display_name: z.string().min(1),
});
export type CreateClientInput = z.infer<typeof CreateClientInputSchema>;

/** Editable subset of ClientProfile: excludes id, client_id, updated_at. */
export const UpdateClientProfileSchema = ClientProfileSchema.omit({
  id: true,
  client_id: true,
  updated_at: true,
});
export type UpdateClientProfile = z.infer<typeof UpdateClientProfileSchema>;

// ---------------------------------------------------------------------------
// Public API — day logs
// ---------------------------------------------------------------------------

const DayExerciseLogSchema = z.object({
  exercise_key: z.string().min(1),
  skipped: z.boolean(),
  feedback: ExerciseFeedbackSchema.nullable(),
  sets: z.array(PerformedSetSchema),
});

function refineSkippedExercisesHaveEmptySets(
  log: {
    exercises: Array<{
      exercise_key: string;
      skipped: boolean;
      sets: unknown[];
    }>;
  },
  ctx: z.RefinementCtx,
): void {
  for (const exercise of log.exercises) {
    if (exercise.skipped && exercise.sets.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: `exercise ${exercise.exercise_key}: a skipped exercise must have empty sets`,
        path: ["exercises"],
      });
    }
  }
}

export const UpdateDayLogSchema = z
  .object({
    completed: z.boolean(),
    exercises: z.array(DayExerciseLogSchema),
  })
  .superRefine(refineSkippedExercisesHaveEmptySets);
export type UpdateDayLog = z.infer<typeof UpdateDayLogSchema>;

/** Athlete Save day body: exercise logs only; server sets completed. */
export const SaveDayLogSchema = z
  .object({
    exercises: z.array(DayExerciseLogSchema),
  })
  .superRefine(refineSkippedExercisesHaveEmptySets);
export type SaveDayLog = z.infer<typeof SaveDayLogSchema>;

// ---------------------------------------------------------------------------
// Cloudflare Workflow — plan turnover input
// ---------------------------------------------------------------------------

export const GeneratedPlanInputSchema = z.object({
  label: z.string().min(1),
  total_weeks: z.number().int().positive(),
  week_template: z.array(PlanDaySchema),
  // Required key (nullable) so OpenAI structured-output JSON Schema accepts it.
  rationale: z.string().nullable(),
});
export type GeneratedPlanInput = z.infer<typeof GeneratedPlanInputSchema>;

export const ActivateGeneratedPlanCommandSchema = z.object({
  workflow_id: z.string().min(1),
  plan: GeneratedPlanInputSchema,
});
export type ActivateGeneratedPlanCommand = z.infer<
  typeof ActivateGeneratedPlanCommandSchema
>;
