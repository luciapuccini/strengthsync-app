import { getActivePlan } from '@/api/client';
import type { Plan } from '@/api/types';

/**
 * Whether the signed-in client already has an active plan — the one thing the
 * onboarding route needs to know before it renders, so a client who already
 * completed the questionnaire cannot run it a second time from the browser.
 *
 * A separate cache from `weekResource`'s, in the same one-promise-per-session
 * shape as `historyResource`: onboarding needs the plan, not a week or a
 * client, and checking it should not depend on the tracker having been
 * visited first.
 */
let activePlanPromise: Promise<Plan | null> | null = null;

export function activePlanResource(): Promise<Plan | null> {
  activePlanPromise ??= getActivePlan().catch((error: unknown) => {
    activePlanPromise = null;
    throw error;
  });
  return activePlanPromise;
}

export function invalidateActivePlan(): void {
  activePlanPromise = null;
}
