import type { WeeklyProgressionInput, WeeklyProgressionResult } from '@strengthsync/domain/contracts'

/**
 * Stub proving the runtime path (start API → Temporal → worker → result).
 * The real activities — complete week → load context → analyze → generate
 * next week → save — arrive with the weekly-progression milestone
 * (docs/architecture/workflows.md).
 */
export async function weeklyProgressionWorkflow(
  input: WeeklyProgressionInput,
): Promise<WeeklyProgressionResult> {
  void input
  return { next_week_id: null, plan_complete: false }
}
