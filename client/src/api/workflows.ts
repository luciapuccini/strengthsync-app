import type { paths } from "./openapi";

import { ApiClientError, toApiError } from "./errors";
import { api } from "./client";

export type CompleteWeekStarted =
  paths["/wf/complete-week"]["post"]["responses"][200]["content"]["application/json"];

export async function startWeeklyProgression(
  clientId: string,
): Promise<CompleteWeekStarted> {
  try {
    const { data, error, response } = await api.POST("/wf/complete-week", {
      body: { clientId },
    });
    if (!response.ok || data === undefined) {
      throw toApiError(response.status, error);
    }
    return data;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    throw new ApiClientError(
      "network",
      0,
      "network_error",
      "could not reach the server",
    );
  }
}
