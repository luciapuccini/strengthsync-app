import type { paths } from './openapi';

import { ApiClientError, toApiError } from './errors';
import { api } from './client';

export type CompleteWeekStarted =
  paths['/api/wf/complete-week']['post']['responses'][200]['content']['application/json'];

export async function startWeeklyProgression(): Promise<CompleteWeekStarted> {
  try {
    const { data, error, response } = await api.POST('/api/wf/complete-week', {});
    if (!response.ok || data === undefined) {
      throw toApiError(response.status, error);
    }
    return data;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    throw new ApiClientError('network', 0, 'network_error', 'could not reach the server');
  }
}

export type WeeklyProgressionStatus =
  paths['/api/wf/complete-week/{instanceId}']['get']['responses'][200]['content']['application/json']['status'];

export async function getWeeklyProgressionStatus(
  instanceId: string,
): Promise<WeeklyProgressionStatus> {
  try {
    const { data, error, response } = await api.GET('/api/wf/complete-week/{instanceId}', {
      params: { path: { instanceId } },
    });
    if (!response.ok || data === undefined) {
      throw toApiError(response.status, error);
    }
    return data.status;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    throw new ApiClientError('network', 0, 'network_error', 'could not reach the server');
  }
}

const POLL_INTERVAL_MS = 2000;

export async function waitForWeeklyProgression(instanceId: string): Promise<'complete' | 'failed'> {
  for (;;) {
    const status = await getWeeklyProgressionStatus(instanceId);
    if (status !== 'running') return status;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}
