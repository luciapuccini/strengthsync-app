import createOpenApiClient from 'openapi-fetch';
import type { paths } from './openapi';

import { ApiClientError, toApiError } from './errors';
import { readEventStream } from './eventStream';
import type {
  Client,
  ClientProfile,
  OnboardingAnswers,
  Plan,
  PlanStreamEvent,
  SaveDayLog,
  UpdateClient,
  UpdateClientProfile,
  UpdateDayLog,
  Week,
} from './types';

let getAccessToken: () => Promise<string | null> = async () => null;

export function setAccessTokenProvider(provider: () => Promise<string | null>): void {
  getAccessToken = provider;
}

export async function authorizedFetch(request: Request): Promise<Response> {
  const token = await getAccessToken();
  if (token) request.headers.set('Authorization', `Bearer ${token}`);
  return fetch(request);
}

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

const api = createOpenApiClient<paths>({
  baseUrl: API_BASE_URL,
  fetch: authorizedFetch,
});

async function orNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiClientError && err.kind === 'not_found') return null;
    throw err;
  }
}

let onUnauthorized: () => void = () => {};

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

function throwOnError<T>(response: { data?: T; error?: unknown; response: Response }): T {
  if (response.response.ok && response.data !== undefined) {
    return response.data;
  }
  const error = toApiError(response.response.status, response.error);
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

async function callEmpty(
  fn: () => Promise<{ error?: unknown; response: Response }>,
): Promise<void> {
  let res: { error?: unknown; response: Response };
  try {
    res = await fn();
  } catch {
    throw new ApiClientError('network', 0, 'network_error', 'could not reach the server');
  }
  if (res.response.ok) return;
  const error = toApiError(res.response.status, res.error);
  if (error.kind === 'unauthorized') onUnauthorized();
  throw error;
}

export async function getMe(): Promise<Client> {
  const res = await call(() => api.GET('/api/me'));
  return res.client;
}

export async function updateUnitPreference(
  preference: UpdateClient['unit_preference'],
): Promise<Client> {
  const res = await call(() => api.PATCH('/api/me', { body: { unit_preference: preference } }));
  return res.client;
}

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

export async function getPlan(planId: string): Promise<Plan> {
  const res = await call(() => api.GET('/api/me/plans/{planId}', { params: { path: { planId } } }));
  return res.plan;
}

export async function* generatePlan(): AsyncGenerator<PlanStreamEvent> {
  const request = new Request(`${API_BASE_URL}/api/me/plans/generate`, {
    method: 'POST',
    headers: { Accept: 'text/event-stream' },
  });

  let response: Response;
  try {
    response = await authorizedFetch(request);
  } catch {
    throw new ApiClientError('network', 0, 'network_error', 'could not reach the server');
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    const error = toApiError(response.status, body);
    if (error.kind === 'unauthorized') onUnauthorized();
    throw error;
  }

  for await (const event of readEventStream<PlanStreamEvent>(response)) {
    yield event;
    if (event.type === 'failed') {
      throw new ApiClientError('server', 0, event.error.code, event.error.message);
    }
  }
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

export async function deleteAccount(): Promise<void> {
  return callEmpty(() => api.DELETE('/api/account'));
}

export { api };
