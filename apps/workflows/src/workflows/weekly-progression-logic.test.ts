import { describe, expect, it, vi } from 'vitest'

import type { WeeklyProgressionActivities } from '../activities/types.ts'
import { CLIENT_ID, WEEK_ID, makeWeeklyContext } from '../activities/test-fixtures.ts'
import { runWeeklyProgression } from './weekly-progression-logic.ts'

describe('runWeeklyProgression', () => {
  it('creates the next week when the plan still has remaining weeks', async () => {
    const nextWeekId = '5e6f7a8b-9c0d-4e1f-a23b-4c5d6e7f8a9b'
    const context = makeWeeklyContext(1, 4)
    const activities: WeeklyProgressionActivities = {
      completeWeekActivity: vi.fn(async () => context.week),
      loadWeeklyContext: vi.fn(async () => context),
      analyzeWeekActivity: vi.fn(async () => 'push compounds'),
      generateNextWeekActivity: vi.fn(async () => []),
      createNextWeekActivity: vi.fn(async () => ({
        ...context.week,
        id: nextWeekId,
        week_index: 2,
        status: 'in_flight' as const,
        schedule: [...context.week.schedule],
      })),
    }

    await expect(
      runWeeklyProgression({ client_id: CLIENT_ID, week_id: WEEK_ID }, 'wf-1', activities),
    ).resolves.toEqual({ next_week_id: nextWeekId, plan_complete: false })
    expect(activities.createNextWeekActivity).toHaveBeenCalledOnce()
  })

  it('returns plan_complete without creating a next week on the final week', async () => {
    const context = makeWeeklyContext(4, 4)
    const activities: WeeklyProgressionActivities = {
      completeWeekActivity: vi.fn(async () => context.week),
      loadWeeklyContext: vi.fn(async () => context),
      analyzeWeekActivity: vi.fn(async () => 'block finished'),
      generateNextWeekActivity: vi.fn(async () => []),
      createNextWeekActivity: vi.fn(async () => context.week),
    }

    await expect(
      runWeeklyProgression({ client_id: CLIENT_ID, week_id: WEEK_ID }, 'wf-1', activities),
    ).resolves.toEqual({ next_week_id: null, plan_complete: true })
    expect(activities.generateNextWeekActivity).not.toHaveBeenCalled()
    expect(activities.createNextWeekActivity).not.toHaveBeenCalled()
  })
})
