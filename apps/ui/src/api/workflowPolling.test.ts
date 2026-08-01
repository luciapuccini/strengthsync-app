import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiClientError } from '@/api/errors'

const { getWorkflowStatus } = vi.hoisted(() => ({
  getWorkflowStatus: vi.fn(),
}))

vi.mock('@/api/client', () => ({ getWorkflowStatus }))

import { startWorkflowWithRetry, waitForWorkflow } from './workflowPolling'

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('workflow polling', () => {
  it('retries a transient workflow start', async () => {
    vi.useFakeTimers()
    const start = vi
      .fn()
      .mockRejectedValueOnce(new ApiClientError('server', 502, 'workflow_api_unreachable', 'unavailable'))
      .mockResolvedValueOnce({ workflow_id: 'workflow-1', status: 'running' })

    const result = startWorkflowWithRetry(start)
    await vi.runAllTimersAsync()

    await expect(result).resolves.toEqual({ workflow_id: 'workflow-1', status: 'running' })
    expect(start).toHaveBeenCalledTimes(2)
  })

  it('continues polling after a transient status failure', async () => {
    vi.useFakeTimers()
    getWorkflowStatus
      .mockRejectedValueOnce(
        new ApiClientError('server', 502, 'workflow_api_unreachable', 'unavailable'),
      )
      .mockResolvedValueOnce({
        workflow_id: 'workflow-1',
        type: 'weekly_progression',
        status: 'succeeded',
        started_at: '2026-07-26T12:00:00.000Z',
        finished_at: '2026-07-26T12:01:00.000Z',
        result: { next_week_id: null, plan_complete: true },
      })

    const result = waitForWorkflow('workflow-1')
    await vi.runAllTimersAsync()

    await expect(result).resolves.toMatchObject({ status: 'succeeded' })
    expect(getWorkflowStatus).toHaveBeenCalledTimes(2)
  })
})
