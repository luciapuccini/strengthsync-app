import { getActivePlan, getCurrentWeek, getMe, listInFlightWeeks } from '@/api/client';
import type { Client, Plan, Week } from '@/api/types';
import { todayIso } from '@/lib/dates';

export type TrackerData = {
  client: Client;
  plan: Plan | null;
  week: Week | null;
  nextWeekStart: string | null;
};

async function findNextWeekStart(): Promise<string | null> {
  const today = todayIso();
  const next = (await listInFlightWeeks()).find((week) => week.start_date > today);
  return next?.start_date ?? null;
}

let trackerPromise: Promise<TrackerData> | null = null;

export function currentWeekResource(): Promise<TrackerData> {
  trackerPromise ??= Promise.all([getMe(), getActivePlan(), getCurrentWeek()])
    .then(async ([client, plan, week]) => ({
      client,
      plan,
      week,
      nextWeekStart: week === null && plan !== null ? await findNextWeekStart() : null,
    }))
    .catch((error: unknown) => {
      trackerPromise = null;
      throw error;
    });
  return trackerPromise;
}

export function invalidateCurrentWeek(): void {
  trackerPromise = null;
}
