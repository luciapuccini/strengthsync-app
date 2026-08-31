import type { paths } from './openapi';
import type { WorkflowStatus } from './types';

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

/** Null when no turnover ran today. See docs/architecture/workflows.md. */
export async function getTurnoverStatus(): Promise<WorkflowStatus | null> {
  try {
    const { data, error, response } = await api.GET('/api/wf/complete-week/status', {});
    if (response.status === 404) return null;
    if (!response.ok || data === undefined) {
      throw toApiError(response.status, error);
    }
    return data.status;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    throw new ApiClientError('network', 0, 'network_error', 'could not reach the server');
  }
}
