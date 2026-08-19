import createOpenApiClient from 'openapi-fetch';
import type { paths } from './openapi';

import { ApiClientError, toApiError } from './errors';
import type {
  ClientProfile,
  OnboardingAnswers,
  Plan,
  SaveDayLog,
  UpdateClientProfile,
  UpdateDayLog,
  Week,
} from './types';

const api = createOpenApiClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
});

/** Run a read that treats a 404 as an expected "no record yet" (returns null). */
async function orNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiClientError && err.kind === 'not_found') return null;
    throw err;
  }
}

/**
 * Invoked for every unauthorized response, so an expired credential behaves the
 * same no matter which screen was open. It is registered at startup rather than
 * imported, which keeps this module free of a store dependency and its tests
 * independent of the store.
 */
let onUnauthorized: () => void = () => {};

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

function throwOnError<T>(response: { data?: T; error?: unknown; response: Response }): T {
  if (response.response.ok && response.data !== undefined) {
    return response.data;
  }
  const error = toApiError(response.response.status, response.error);
  // Every 401 lands here, including the blanket one the guard currently answers
  // with. Signing out an athlete who is already signed out changes nothing, and
  // exempting any call would mean threading an opt-out through every wrapper for
  // no gain.
  if (error.kind === 'unauthorized') onUnauthorized();
  throw error;
}

/** Run an openapi-fetch call, mapping a thrown fetch failure to a network error. */
async function call<T>(
  fn: () => Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let res: { data?: T; error?: unknown; response: Response };
  try {
    res = await fn();
  } catch {
    throw new ApiClientError('network', 0, 'network_error', 'could not reach the server');
  }
  return throwOnError(res);
}

/**
 * There are no sign-in, sign-up, sign-out or session calls here any more. Auth0
 * owns all four: authorization happens on its hosted page, not against a route
 * of ours, and `issues/013-web-app-universal-login.md` wires the SDK in. Until
 * then nothing can authenticate and every call below answers 401.
 *
 * Everything below addresses `/api/me`, which takes the athlete from the
 * verified credential. None of these accepts an athlete id, so the browser
 * cannot ask for anyone else's data — and no caller has to know whose data it is
 * asking for.
 */

export async function getProfile(): Promise<ClientProfile | null> {
  return orNull(async () => {
    const res = await call(() => api.GET('/api/me/profile'));
    return res.profile;
  });
}

export async function updateProfile(input: UpdateClientProfile): Promise<ClientProfile> {
  const res = await call(() => api.PUT('/api/me/profile', { body: input }));
  return res.profile;
}

/** Turns onboarding answers into the signed-in client's coaching profile. */
export async function submitOnboarding(input: OnboardingAnswers): Promise<ClientProfile> {
  const res = await call(() => api.POST('/api/me/onboarding', { body: input }));
  return res.profile;
}

export async function getActivePlan(): Promise<Plan | null> {
  return orNull(async () => {
    const res = await call(() => api.GET('/api/me/plans/active'));
    return res.plan;
  });
}

/**
 * No caller since the history screen started resolving the active plan itself.
 * Kept deliberately, with its route: the parent PRD flags the by-id plan read
 * for the same consumerless-route audit that previously cut three others,
 * rather than cutting it inside this phase.
 */
export async function getPlan(planId: string): Promise<Plan> {
  const res = await call(() => api.GET('/api/me/plans/{planId}', { params: { path: { planId } } }));
  return res.plan;
}

/** Generates and activates the signed-in client's first plan from their profile. */
export async function generatePlan(): Promise<{ plan: Plan; first_week: Week }> {
  return call(() => api.POST('/api/me/plans/generate', {}));
}

export async function getCurrentWeek(): Promise<Week | null> {
  return orNull(async () => {
    const res = await call(() => api.GET('/api/me/weeks/current'));
    return res.week;
  });
}

export async function listCompletedWeeks(planId: string): Promise<Week[]> {
  const res = await call(() =>
    api.GET('/api/me/weeks', {
      params: { query: { status: 'completed', planId } },
    }),
  );
  return res.weeks;
}

export async function saveDayLog(
  weekId: string,
  dayIndex: number,
  input: SaveDayLog,
): Promise<Week> {
  const res = await call(() =>
    api.POST('/api/me/weeks/{weekId}/days/{dayIndex}/save', {
      params: { path: { weekId, dayIndex } },
      body: input,
    }),
  );
  return res.week;
}

export async function updateDayLog(
  weekId: string,
  dayIndex: number,
  input: UpdateDayLog,
): Promise<Week> {
  const res = await call(() =>
    api.PATCH('/api/me/weeks/{weekId}/days/{dayIndex}', {
      params: { path: { weekId, dayIndex } },
      body: input,
    }),
  );
  return res.week;
}

// Re-export the shared openapi-fetch client for callers that need direct access
// (e.g. the workflow trigger, which uses a different response shape).
export { api };
