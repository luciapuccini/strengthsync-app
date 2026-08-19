import { getActivePlan, getCurrentWeek, getMe } from '@/api/client';
import type { Client, Plan, Week } from '@/api/types';

export type TrackerData = {
  client: Client;
  plan: Plan | null;
  week: Week | null;
};

/**
 * One promise, not a map keyed by athlete: the verified credential decides whose
 * data this is, so there is only ever one athlete's tracker to cache.
 *
 * The athlete comes from `GET /api/me`, which
 * `issues/012-token-verification-and-provisioning.md` restored — it was null
 * between the amputation in `issues/011-amputate-old-auth.md` and that route
 * existing. Two things need it: `reconcileWeekDraft` keys the local week draft
 * by athlete id, and `trackerSlice.saveDay` refuses to write without one.
 *
 * All three are fetched together rather than in sequence, so the tracker waits
 * on one round trip instead of two. `client` is non-null whenever this resolves:
 * a caller who is not signed in never gets here, because the whole `Promise.all`
 * rejects on the first 401.
 */
let trackerPromise: Promise<TrackerData> | null = null;

export function currentWeekResource(): Promise<TrackerData> {
  trackerPromise ??= Promise.all([getMe(), getActivePlan(), getCurrentWeek()])
    .then(([client, plan, week]) => ({ client, plan, week }))
    .catch((error: unknown) => {
      trackerPromise = null;
      throw error;
    });
  return trackerPromise;
}

export function invalidateCurrentWeek(): void {
  trackerPromise = null;
}
