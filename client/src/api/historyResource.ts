import { getActivePlan, listCompletedWeeks } from '@/api/client';
import type { Plan, Week } from '@/api/types';

export type HistoryData = {
  weeks: Week[];
  plan: Plan | null;
};

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
