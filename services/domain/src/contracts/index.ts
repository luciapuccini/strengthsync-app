import { z } from 'zod'

import {
  ClientProfileSchema,
  ClientSchema,
  ExerciseFeedbackSchema,
  ISODateTimeSchema,
  PerformedSetSchema,
  PlanDaySchema,
  PlanSchema,
  UuidSchema,
  WeekDaySchema,
  WeekSchema,
} from '../model/index.ts'

/**
 * API request/response DTOs, validated by Zod on both sides of every API
 * boundary. Source of truth: docs/architecture/api_contracts.md (public +
 * internal) and docs/architecture/workflows.md (workflow inputs/outputs).
 */

export type ApiError = {
  error: {
    code: string
    message: string
  }
}

// ---------------------------------------------------------------------------
// Public API — clients and profile
// ---------------------------------------------------------------------------

export const CreateClientInputSchema = z.object({
  display_name: z.string().min(1),
})
export type CreateClientInput = z.infer<typeof CreateClientInputSchema>

/** Editable subset of ClientProfile: excludes id, client_id, updated_at. */
export const UpdateClientProfileSchema = ClientProfileSchema.omit({
  id: true,
  client_id: true,
  updated_at: true,
})
export type UpdateClientProfile = z.infer<typeof UpdateClientProfileSchema>

// ---------------------------------------------------------------------------
// Public API — day logs
// ---------------------------------------------------------------------------

export const UpdateDayLogSchema = z
  .object({
    completed: z.boolean(),
    exercises: z.array(
      z.object({
        exercise_key: z.string().min(1),
        skipped: z.boolean(),
        feedback: ExerciseFeedbackSchema.nullable(),
        sets: z.array(PerformedSetSchema),
      }),
    ),
  })
  .superRefine((log, ctx) => {
    for (const exercise of log.exercises) {
      if (exercise.skipped && exercise.sets.length > 0) {
        ctx.addIssue({
          code: 'custom',
          message: `exercise ${exercise.exercise_key}: a skipped exercise must have empty sets`,
          path: ['exercises'],
        })
      }
    }
  })
export type UpdateDayLog = z.infer<typeof UpdateDayLogSchema>

// ---------------------------------------------------------------------------
// Workflows — inputs, results, status (docs/architecture/workflows.md)
// ---------------------------------------------------------------------------

export const WeeklyProgressionInputSchema = z.object({
  client_id: UuidSchema,
  week_id: UuidSchema,
})
export type WeeklyProgressionInput = z.infer<typeof WeeklyProgressionInputSchema>

export const WeeklyProgressionResultSchema = z.object({
  next_week_id: UuidSchema.nullable(),
  plan_complete: z.boolean(),
})
export type WeeklyProgressionResult = z.infer<typeof WeeklyProgressionResultSchema>

export const PlanGenerationInputSchema = z.object({
  client_id: UuidSchema,
  notes: z.string().optional(),
})
export type PlanGenerationInput = z.infer<typeof PlanGenerationInputSchema>

export const PlanGenerationResultSchema = z.object({
  plan_id: UuidSchema,
  first_week_id: UuidSchema,
})
export type PlanGenerationResult = z.infer<typeof PlanGenerationResultSchema>

/** Browser-facing start body for weekly progression (client id comes from the URL). */
export const StartWeeklyProgressionSchema = z.object({
  week_id: UuidSchema,
})
export type StartWeeklyProgression = z.infer<typeof StartWeeklyProgressionSchema>

/** Browser-facing start body for plan generation. */
export const StartPlanGenerationSchema = z.object({
  notes: z.string().optional(),
})
export type StartPlanGeneration = z.infer<typeof StartPlanGenerationSchema>

export const WorkflowTypeSchema = z.enum(['weekly_progression', 'plan_generation'])
export type WorkflowType = z.infer<typeof WorkflowTypeSchema>

export const WorkflowStatusSchema = z.discriminatedUnion('status', [
  z.object({
    workflow_id: z.string().min(1),
    type: WorkflowTypeSchema,
    status: z.literal('running'),
    started_at: ISODateTimeSchema,
  }),
  z.object({
    workflow_id: z.string().min(1),
    type: WorkflowTypeSchema,
    status: z.literal('succeeded'),
    started_at: ISODateTimeSchema,
    finished_at: ISODateTimeSchema,
    result: z.union([WeeklyProgressionResultSchema, PlanGenerationResultSchema]),
  }),
  z.object({
    workflow_id: z.string().min(1),
    type: WorkflowTypeSchema,
    status: z.literal('failed'),
    started_at: ISODateTimeSchema,
    finished_at: ISODateTimeSchema,
    error: z.object({ code: z.string(), message: z.string() }),
  }),
])
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>

export const WorkflowStartedSchema = z.object({
  workflow_id: z.string().min(1),
  status: z.literal('running'),
})
export type WorkflowStarted = z.infer<typeof WorkflowStartedSchema>

// ---------------------------------------------------------------------------
// Internal workflow-to-data API (docs/architecture/api_contracts.md)
// ---------------------------------------------------------------------------

export const GeneratedPlanInputSchema = z.object({
  label: z.string().min(1),
  total_weeks: z.number().int().positive(),
  week_template: z.array(PlanDaySchema),
  rationale: z.string().nullable().optional(),
})
export type GeneratedPlanInput = z.infer<typeof GeneratedPlanInputSchema>

export const WeeklyContextSchema = z.object({
  client: ClientSchema,
  profile: ClientProfileSchema,
  active_plan: PlanSchema,
  week: WeekSchema,
  coaching_rules: z.string(),
})
export type WeeklyContext = z.infer<typeof WeeklyContextSchema>

export const PlanGenerationContextSchema = z.object({
  client: ClientSchema,
  profile: ClientProfileSchema,
  active_plan: PlanSchema,
  completed_weeks: z.array(WeekSchema),
  coaching_rules: z.string(),
})
export type PlanGenerationContext = z.infer<typeof PlanGenerationContextSchema>

export const CompleteWeekCommandSchema = z.object({
  workflow_id: z.string().min(1),
})
export type CompleteWeekCommand = z.infer<typeof CompleteWeekCommandSchema>

export const CreateNextWeekCommandSchema = z.object({
  workflow_id: z.string().min(1),
  previous_week_id: UuidSchema,
  schedule: z.array(WeekDaySchema),
})
export type CreateNextWeekCommand = z.infer<typeof CreateNextWeekCommandSchema>

export const ActivateGeneratedPlanCommandSchema = z.object({
  workflow_id: z.string().min(1),
  plan: GeneratedPlanInputSchema,
})
export type ActivateGeneratedPlanCommand = z.infer<typeof ActivateGeneratedPlanCommandSchema>
