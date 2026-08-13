import createOpenApiClient from "openapi-fetch";
import type { paths } from "./openapi";

import { ApiClientError, toApiError } from "./errors";
import type {
  Client,
  ClientProfile,
  CreateClientInput,
  Plan,
  SaveDayLog,
  SignInInput,
  SignUpInput,
  UpdateClientProfile,
  UpdateDayLog,
  Week,
} from "./types";

const api = createOpenApiClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
});

/** Run a read that treats a 404 as an expected "no record yet" (returns null). */
async function orNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiClientError && err.kind === "not_found") return null;
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

function throwOnError<T>(response: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  if (response.response.ok && response.data !== undefined) {
    return response.data;
  }
  const error = toApiError(response.response.status, response.error);
  // The auth calls raise a 401 of their own — a bootstrap with no cookie, a
  // wrong password — and this fires for those too. Signing out an athlete who
  // is already signed out changes nothing, and exempting them would mean
  // threading an opt-out through every wrapper for no gain.
  if (error.kind === "unauthorized") onUnauthorized();
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
    throw new ApiClientError(
      "network",
      0,
      "network_error",
      "could not reach the server",
    );
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
  return (await call(() => api.POST("/auth/sign-up", { body: input }))).client;
}

/**
 * Exchange credentials for a session cookie. The server answers one 401 for a
 * wrong password and an unknown email alike, so the message this rejects with
 * is safe to show verbatim.
 */
export async function signIn(input: SignInInput): Promise<Client> {
  return (await call(() => api.POST("/auth/sign-in", { body: input }))).client;
}

/**
 * Clear the session cookie server-side. Safe to call with an expired cookie or
 * none at all — the route is deliberately outside the session guard.
 */
export async function signOut(): Promise<void> {
  await call(() => api.POST("/auth/sign-out", {}));
}

/** The signed-in client, or a 401 thrown as an unauthorized ApiClientError. */
export async function getSession(): Promise<Client> {
  return (await call(() => api.GET("/auth/session"))).client;
}

export async function getClients(): Promise<Client[]> {
  return (await call(() => api.GET("/api/clients"))).clients;
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  return (await call(() => api.POST("/api/clients", { body: input }))).client;
}

export async function getProfile(
  clientId: string,
): Promise<ClientProfile | null> {
  return orNull(async () => {
    const res = await call(() =>
      api.GET("/api/clients/{clientId}/profile", {
        params: { path: { clientId } },
      }),
    );
    return res.profile;
  });
}

export async function updateProfile(
  clientId: string,
  input: UpdateClientProfile,
): Promise<ClientProfile> {
  const res = await call(() =>
    api.PUT("/api/clients/{clientId}/profile", {
      params: { path: { clientId } },
      body: input,
    }),
  );
  return res.profile;
}

export async function getActivePlan(clientId: string): Promise<Plan | null> {
  return orNull(async () => {
    const res = await call(() =>
      api.GET("/api/clients/{clientId}/plans/active", {
        params: { path: { clientId } },
      }),
    );
    return res.plan;
  });
}

export async function getPlan(clientId: string, planId: string): Promise<Plan> {
  const res = await call(() =>
    api.GET("/api/clients/{clientId}/plans/{planId}", {
      params: { path: { clientId, planId } },
    }),
  );
  return res.plan;
}

export async function getCurrentWeek(clientId: string): Promise<Week | null> {
  return orNull(async () => {
    const res = await call(() =>
      api.GET("/api/clients/{clientId}/weeks/current", {
        params: { path: { clientId } },
      }),
    );
    return res.week;
  });
}

export async function listCompletedWeeks(
  clientId: string,
  planId: string,
): Promise<Week[]> {
  const res = await call(() =>
    api.GET("/api/clients/{clientId}/weeks", {
      params: {
        path: { clientId },
        query: { status: "completed", planId },
      },
    }),
  );
  return res.weeks;
}

export async function saveDayLog(
  clientId: string,
  weekId: string,
  dayIndex: number,
  input: SaveDayLog,
): Promise<Week> {
  const res = await call(() =>
    api.POST("/api/clients/{clientId}/weeks/{weekId}/days/{dayIndex}/save", {
      params: { path: { clientId, weekId, dayIndex } },
      body: input,
    }),
  );
  return res.week;
}

export async function updateDayLog(
  clientId: string,
  weekId: string,
  dayIndex: number,
  input: UpdateDayLog,
): Promise<Week> {
  const res = await call(() =>
    api.PATCH("/api/clients/{clientId}/weeks/{weekId}/days/{dayIndex}", {
      params: { path: { clientId, weekId, dayIndex } },
      body: input,
    }),
  );
  return res.week;
}

// Re-export the shared openapi-fetch client for callers that need direct access
// (e.g. the workflow trigger, which uses a different response shape).
export { api };
