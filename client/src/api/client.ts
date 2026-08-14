import createOpenApiClient from 'openapi-fetch';
import type { paths } from './openapi';

import { ApiClientError, toApiError } from './errors';
import type {
  Client,
  ClientProfile,
  OnboardingAnswers,
  Plan,
  SaveDayLog,
  SignInInput,
  SignUpInput,
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
 * Invoked for every unauthorized response, so an expired session behaves the
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
  // The auth calls raise a 401 of their own — a bootstrap with no cookie, a
  // wrong password — and this fires for those too. Signing out an athlete who
  // is already signed out changes nothing, and exempting them would mean
  // threading an opt-out through every wrapper for no gain.
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
 * Register and sign in in one call. The session cookie rides on the response;
 * it is HttpOnly, so nothing here reads or stores it — the browser attaches it
 * to later requests on its own, same-origin in both dev (through the vite
 * proxy) and production (the Worker serves the app).
 */
export async function signUp(input: SignUpInput): Promise<Client> {
  return (await call(() => api.POST('/auth/sign-up', { body: input }))).client;
}

/**
 * Exchange credentials for a session cookie. The server answers one 401 for a
 * wrong password and an unknown email alike, so the message this rejects with
 * is safe to show verbatim.
 */
export async function signIn(input: SignInInput): Promise<Client> {
  return (await call(() => api.POST('/auth/sign-in', { body: input }))).client;
}

/**
 * Clear the session cookie server-side. Safe to call with an expired cookie or
 * none at all — the route is deliberately outside the session guard.
 */
export async function signOut(): Promise<void> {
  await call(() => api.POST('/auth/sign-out', {}));
}

/** The signed-in client, or a 401 thrown as an unauthorized ApiClientError. */
export async function getSession(): Promise<Client> {
  return (await call(() => api.GET('/auth/session'))).client;
}

/**
 * Everything below addresses `/api/me`, which takes the athlete from the session
 * cookie. None of these accepts an athlete id, so the browser cannot ask for
 * anyone else's data — and no caller has to know whose data it is asking for.
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
