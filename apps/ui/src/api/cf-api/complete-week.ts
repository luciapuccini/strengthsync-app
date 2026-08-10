import type { components } from "@strengthsync/api-contract";
import { ApiClientError, toApiError } from "@/api/errors";
import { wf } from "./workflows-api";

export type CompleteWeekStarted = components["schemas"]["CompleteWeekStarted"];

export async function startWeeklyProgression(
  clientId: string,
  // weekId: string, // WIP: user should only have 1 in_flight week to complete
): Promise<CompleteWeekStarted> {
  try {
    const { data, error, response } = await wf.POST("/wf/complete-week", {
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
