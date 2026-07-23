import { proxyActivities, workflowInfo } from '@temporalio/workflow'

import type {
  PlanGenerationInput,
  PlanGenerationResult,
} from '@strengthsync/domain/contracts'

import type { PlanGenerationActivities } from '../activities/types.ts'

const data = proxyActivities<
  Pick<PlanGenerationActivities, 'loadPlanGenerationContext' | 'activateGeneratedPlan'>
>({
  startToCloseTimeout: '30 seconds',
  retry: { maximumAttempts: 3 },
})

const llm = proxyActivities<
  Pick<
    PlanGenerationActivities,
    'summarizePlanProfile' | 'summarizePlanHistory' | 'generatePlanDocument'
  >
>({
  // History/profile summaries: 2 minutes, plan generation: 3 minutes (docs/architecture/workflows.md).
  // Use the stricter plan-generation budget for all LLM activities in this workflow.
  startToCloseTimeout: '3 minutes',
  retry: { maximumAttempts: 2 },
})

/**
 * Load context → summarize profile/history → generate plan → activate + week 1.
 * See docs/architecture/workflows.md.
 */
export async function planGenerationWorkflow(
  input: PlanGenerationInput,
): Promise<PlanGenerationResult> {
  const workflow_id = workflowInfo().workflowId
  const context = await data.loadPlanGenerationContext({ client_id: input.client_id })

  const [profile_summary, history_summary] = await Promise.all([
    llm.summarizePlanProfile({
      workflow_id,
      client_id: input.client_id,
      context,
    }),
    llm.summarizePlanHistory({
      workflow_id,
      client_id: input.client_id,
      context,
    }),
  ])

  const plan = await llm.generatePlanDocument({
    workflow_id,
    client_id: input.client_id,
    context,
    profile_summary,
    history_summary,
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  })

  return data.activateGeneratedPlan({
    workflow_id,
    client_id: input.client_id,
    plan,
  })
}
