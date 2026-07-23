import { proxyActivities, workflowInfo } from '@temporalio/workflow'

import type { WeeklyProgressionInput, WeeklyProgressionResult } from '@strengthsync/domain/contracts'

import type { WeeklyProgressionActivities } from '../activities/types.ts'
import { runWeeklyProgression } from './weekly-progression-logic.ts'

const data = proxyActivities<
  Pick<
    WeeklyProgressionActivities,
    'completeWeekActivity' | 'loadWeeklyContext' | 'createNextWeekActivity'
  >
>({
  startToCloseTimeout: '30 seconds',
  retry: { maximumAttempts: 3 },
})

const analyze = proxyActivities<Pick<WeeklyProgressionActivities, 'analyzeWeekActivity'>>({
  startToCloseTimeout: '2 minutes',
  retry: { maximumAttempts: 2 },
})

const generate = proxyActivities<Pick<WeeklyProgressionActivities, 'generateNextWeekActivity'>>({
  startToCloseTimeout: '3 minutes',
  retry: { maximumAttempts: 2 },
})

/**
 * Complete week → load context → analyze → plan boundary or generate/create next week.
 * See docs/architecture/workflows.md.
 */
export async function weeklyProgressionWorkflow(
  input: WeeklyProgressionInput,
): Promise<WeeklyProgressionResult> {
  const activities: WeeklyProgressionActivities = {
    completeWeekActivity: data.completeWeekActivity,
    loadWeeklyContext: data.loadWeeklyContext,
    createNextWeekActivity: data.createNextWeekActivity,
    analyzeWeekActivity: analyze.analyzeWeekActivity,
    generateNextWeekActivity: generate.generateNextWeekActivity,
  }
  return runWeeklyProgression(input, workflowInfo().workflowId, activities)
}
