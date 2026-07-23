import type {
  GeneratedPlanInput,
  PlanGenerationContext,
  WeeklyContext,
} from '@strengthsync/domain/contracts'
import type { Week, WeekDay } from '@strengthsync/domain/model'

/**
 * Activity interfaces shared by Temporal workflows (type-only) and the
 * Node activity implementations. Kept free of Node/provider imports so the
 * workflow bundle stays deterministic.
 */
export type PlanGenerationActivities = {
  loadPlanGenerationContext(input: {
    client_id: string
  }): Promise<PlanGenerationContext>
  summarizePlanProfile(input: {
    workflow_id: string
    client_id: string
    context: PlanGenerationContext
  }): Promise<string>
  summarizePlanHistory(input: {
    workflow_id: string
    client_id: string
    context: PlanGenerationContext
  }): Promise<string>
  generatePlanDocument(input: {
    workflow_id: string
    client_id: string
    context: PlanGenerationContext
    profile_summary: string
    history_summary: string
    notes?: string
  }): Promise<GeneratedPlanInput>
  activateGeneratedPlan(input: {
    workflow_id: string
    client_id: string
    plan: GeneratedPlanInput
  }): Promise<{ plan_id: string; first_week_id: string }>
}

export type WeeklyProgressionActivities = {
  completeWeekActivity(input: {
    workflow_id: string
    client_id: string
    week_id: string
  }): Promise<Week>
  loadWeeklyContext(input: {
    client_id: string
    week_id: string
  }): Promise<WeeklyContext>
  analyzeWeekActivity(input: {
    workflow_id: string
    client_id: string
    context: WeeklyContext
  }): Promise<string>
  generateNextWeekActivity(input: {
    workflow_id: string
    client_id: string
    context: WeeklyContext
    analysis: string
  }): Promise<WeekDay[]>
  createNextWeekActivity(input: {
    workflow_id: string
    client_id: string
    previous_week_id: string
    schedule: WeekDay[]
  }): Promise<Week>
}
