import createOpenApiClient from "openapi-fetch";
import type { paths } from "@strengthsync/shared";

import { ApiClientError, toApiError } from "./errors";
import type {
  Client,
  ClientProfile,
  CreateClientInput,
  Plan,
  SaveDayLog,
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

function throwOnError<T>(
  response: { data?: T; error?: unknown; response: Response },
): T {
  if (!response.response.ok || response.data === undefined) {
    throw toApiError(response.response.status, response.error);
  }
  return response.data;
}

/** Run an openapi-fetch call, mapping a thrown fetch failure to a network error. */
async function call<T>(
  fn: () => Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let res: { data?: T; error?: unknown; response: Response };
  try {
    res = await fn();
  } catch {
    throw new ApiClientError("network", 0, "network_error", "could not reach the server");
  }
  return throwOnError(res);
}

export async function getClients(): Promise<Client[]> {
  return (await call(() => api.GET("/api/clients"))).clients;
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  return (await call(() => api.POST("/api/clients", { body: input }))).client;
}

export async function getProfile(clientId: string): Promise<ClientProfile | null> {
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

export async function listCompletedWeeks(clientId: string, planId: string): Promise<Week[]> {
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

