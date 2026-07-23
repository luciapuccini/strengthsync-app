import type {
  GeneratedPlanInput,
  PlanGenerationContext,
} from '@strengthsync/domain/contracts'

/**
 * Activity interface shared by the Temporal workflow (type-only) and the
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
