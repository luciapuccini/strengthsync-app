import { getActivePlan, getCurrentWeek } from '@/api/client';
import type { Client, Plan, Week } from '@/api/types';

export type TrackerData = {
  client: Client | null;
  plan: Plan | null;
  week: Week | null;
};

/**
 * One promise, not a map keyed by athlete: the verified credential decides whose
 * data this is, so there is only ever one athlete's tracker to cache.
 *
 * `client` is null for now. It used to come from the session bootstrap, which
 * `issues/011-amputate-old-auth.md` deleted along with the route behind it;
 * `issues/012-token-verification-and-provisioning.md` re-sources it from
 * `GET /api/me`. Two things depend on it and are therefore degraded until then:
 * `reconcileWeekDraft` keys the local week draft by athlete id, and
 * `trackerSlice.saveDay` refuses to write without one. Neither is reachable in
 * the interim — every /api/* call answers 401, so this promise rejects before
 * `client` is ever read, and `RequireAuth` redirects away from the tracker.
 */
let trackerPromise: Promise<TrackerData> | null = null;

export function currentWeekResource(): Promise<TrackerData> {
  trackerPromise ??= Promise.all([getActivePlan(), getCurrentWeek()])
    .then(([plan, week]) => ({ client: null, plan, week }))
    .catch((error: unknown) => {
      trackerPromise = null;
      throw error;
    });
  return trackerPromise;
}

export function invalidateCurrentWeek(): void {
  trackerPromise = null;
}
