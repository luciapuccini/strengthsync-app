import { getActivePlan, listCompletedWeeks } from '@/api/client';
import type { Plan, Week } from '@/api/types';

export type HistoryData = {
  weeks: Week[];
  /** Null when there is no active plan, which is also when `weeks` is empty. */
  plan: Plan | null;
};

/**
 * One promise and no arguments: the URL no longer names a plan, so this resolves
 * the signed-in client's active plan and reads that plan's completed weeks.
 *
 * The consequence, accepted in the PRD: there is no way to view an archived
 * plan's history. No screen offered one either.
 */
let historyPromise: Promise<HistoryData> | null = null;

export function completedWeeksResource(): Promise<HistoryData> {
  historyPromise ??= getActivePlan()
    .then(async (plan) =>
      plan === null ? { weeks: [], plan } : { weeks: await listCompletedWeeks(plan.id), plan },
    )
    .catch((error: unknown) => {
      historyPromise = null;
      throw error;
    });
  return historyPromise;
}

export function invalidateCompletedWeeks(): void {
  historyPromise = null;
}
