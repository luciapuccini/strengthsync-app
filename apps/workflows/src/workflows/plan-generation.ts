import type { PlanGenerationInput, PlanGenerationResult } from '@strengthsync/domain/contracts'

/** All-zero sentinel ids make stub output unmistakable until the real activities land. */
const STUB_PLAN_ID = '00000000-0000-4000-8000-0000000000aa'
const STUB_WEEK_ID = '00000000-0000-4000-8000-0000000000ab'

/**
 * Stub proving the runtime path. The real activities — load context →
 * summarize history/profile → generate plan → validate → activate — arrive
 * with the plan-generation milestone (docs/architecture/workflows.md).
 */
export async function planGenerationWorkflow(
  input: PlanGenerationInput,
): Promise<PlanGenerationResult> {
  void input
  return { plan_id: STUB_PLAN_ID, first_week_id: STUB_WEEK_ID }
}
