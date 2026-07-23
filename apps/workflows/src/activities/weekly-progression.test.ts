import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CLIENT_ID, WEEK_ID, makeWeeklyContext } from './test-fixtures.ts'

const completeWeek = vi.fn()

vi.mock('@strengthsync/agent', () => ({
  createOpenAiRuntime: () => ({ generateObject: vi.fn() }),
  analyzeWeek: vi.fn(),
  generateNextWeek: vi.fn(),
}))

vi.mock('../observability/llm-call-recorder.ts', () => ({
  createConsoleRecorder: () => ({ record: vi.fn() }),
}))

vi.mock('./internal-api.ts', async () => {
  const actual = await vi.importActual<typeof import('./internal-api.ts')>('./internal-api.ts')
  return {
    ...actual,
    createInternalApiClient: () => ({
      completeWeek,
      getWeeklyContext: vi.fn(),
      createNextWeek: vi.fn(),
    }),
  }
})

describe('completeWeekActivity error mapping', () => {
  beforeEach(() => {
    completeWeek.mockReset()
  })

  it('maps non-retryable InternalApiError to ApplicationFailure.nonRetryable', async () => {
    const { InternalApiError } = await import('./internal-api.ts')
    const { completeWeekActivity } = await import('./weekly-progression.ts')

    completeWeek.mockRejectedValueOnce(
      new InternalApiError(400, 'week_days_incomplete', 'week has incomplete days'),
    )

    await expect(
      completeWeekActivity({
        workflow_id: 'wf-1',
        client_id: CLIENT_ID,
        week_id: WEEK_ID,
      }),
    ).rejects.toMatchObject({
      name: 'ApplicationFailure',
      nonRetryable: true,
      type: 'week_days_incomplete',
    })
  })

  it('returns the completed week on success', async () => {
    const week = makeWeeklyContext().week
    completeWeek.mockResolvedValueOnce(week)
    const { completeWeekActivity } = await import('./weekly-progression.ts')

    await expect(
      completeWeekActivity({
        workflow_id: 'wf-1',
        client_id: CLIENT_ID,
        week_id: WEEK_ID,
      }),
    ).resolves.toEqual(week)
  })
})
