import { ApplicationFailure } from '@temporalio/common'
import { describe, expect, it, vi } from 'vitest'

import type { WeeklyProgressionActivities } from '../activities/types.ts'
import { CLIENT_ID, WEEK_ID, makeWeeklyContext } from '../activities/test-fixtures.ts'
import { runWeeklyProgression } from './weekly-progression-logic.ts'

const NEXT_WEEK_ID = '5e6f7a8b-9c0d-4e1f-a23b-4c5d6e7f8a9b'

function makeActivities(
  context: ReturnType<typeof makeWeeklyContext>,
  overrides: Partial<WeeklyProgressionActivities> = {},
): WeeklyProgressionActivities {
  return {
    completeWeekActivity: vi.fn(async () => context.week),
    loadWeeklyContext: vi.fn(async () => context),
    analyzeWeekActivity: vi.fn(async () => 'push compounds'),
    generateNextWeekActivity: vi.fn(async () => []),
    createNextWeekActivity: vi.fn(async () => ({
      ...context.week,
      id: NEXT_WEEK_ID,
      week_index: context.week.week_index + 1,
      status: 'in_flight' as const,
      schedule: [...context.week.schedule],
    })),
    ...overrides,
  }
}

describe('runWeeklyProgression happy path', () => {
  it('creates the next week when the plan still has remaining weeks', async () => {
    const context = makeWeeklyContext(1, 4)
    const activities = makeActivities(context)

    await expect(
      runWeeklyProgression({ client_id: CLIENT_ID, week_id: WEEK_ID }, 'wf-1', activities),
    ).resolves.toEqual({ next_week_id: NEXT_WEEK_ID, plan_complete: false })
    expect(activities.createNextWeekActivity).toHaveBeenCalledOnce()
  })

  it('returns plan_complete without creating a next week on the final week', async () => {
    const context = makeWeeklyContext(4, 4)
    const activities = makeActivities(context)

    await expect(
      runWeeklyProgression({ client_id: CLIENT_ID, week_id: WEEK_ID }, 'wf-1', activities),
    ).resolves.toEqual({ next_week_id: null, plan_complete: true })
    expect(activities.generateNextWeekActivity).not.toHaveBeenCalled()
    expect(activities.createNextWeekActivity).not.toHaveBeenCalled()
  })
})

describe('runWeeklyProgression retries', () => {
  it('retries after analyze failure without creating a next week on the failed attempt', async () => {
    const context = makeWeeklyContext(1, 4)
    let analyzeCalls = 0
    const activities = makeActivities(context, {
      analyzeWeekActivity: vi.fn(async () => {
        analyzeCalls += 1
        if (analyzeCalls === 1) throw new Error('llm timeout')
        return 'push compounds'
      }),
    })

    await expect(
      runWeeklyProgression({ client_id: CLIENT_ID, week_id: WEEK_ID }, 'wf-1', activities),
    ).rejects.toThrow('llm timeout')
    expect(activities.completeWeekActivity).toHaveBeenCalledOnce()
    expect(activities.createNextWeekActivity).not.toHaveBeenCalled()

    await expect(
      runWeeklyProgression({ client_id: CLIENT_ID, week_id: WEEK_ID }, 'wf-1', activities),
    ).resolves.toEqual({ next_week_id: NEXT_WEEK_ID, plan_complete: false })
    expect(activities.completeWeekActivity).toHaveBeenCalledTimes(2)
    expect(activities.createNextWeekActivity).toHaveBeenCalledOnce()
  })

  it('create retries return the same next_week_id (write-then-timeout)', async () => {
    const context = makeWeeklyContext(1, 4)
    const nextWeek = {
      ...context.week,
      id: NEXT_WEEK_ID,
      week_index: 2,
      status: 'in_flight' as const,
      schedule: [...context.week.schedule],
    }
    const activities = makeActivities(context, {
      createNextWeekActivity: vi.fn(async () => nextWeek),
    })

    const first = await runWeeklyProgression(
      { client_id: CLIENT_ID, week_id: WEEK_ID },
      'wf-1',
      activities,
    )
    const retryCreate = await activities.createNextWeekActivity({
      workflow_id: 'wf-1',
      client_id: CLIENT_ID,
      previous_week_id: WEEK_ID,
      schedule: [],
    })

    expect(first.next_week_id).toBe(NEXT_WEEK_ID)
    expect(retryCreate.id).toBe(NEXT_WEEK_ID)
    expect(activities.createNextWeekActivity).toHaveBeenCalledTimes(2)
  })

  it('propagates non-retryable complete-week validation failures', async () => {
    const context = makeWeeklyContext(1, 4)
    const activities = makeActivities(context, {
      completeWeekActivity: vi.fn(async () => {
        throw ApplicationFailure.nonRetryable('incomplete days', 'week_days_incomplete')
      }),
    })

    await expect(
      runWeeklyProgression({ client_id: CLIENT_ID, week_id: WEEK_ID }, 'wf-1', activities),
    ).rejects.toMatchObject({
      nonRetryable: true,
      type: 'week_days_incomplete',
    })
    expect(activities.analyzeWeekActivity).not.toHaveBeenCalled()
    expect(activities.createNextWeekActivity).not.toHaveBeenCalled()
  })
})
