import { afterEach, describe, expect, it, vi } from 'vitest'

import { makeWeek } from '@/test/weekFixture'

const { listCompletedWeeks, getPlan } = vi.hoisted(() => ({
  listCompletedWeeks: vi.fn(),
  getPlan: vi.fn(),
}))

vi.mock('@/api/client', () => ({ listCompletedWeeks, getPlan }))

import { completedWeeksResource, invalidateCompletedWeeks } from './historyResource'

const CLIENT = '00000000-0000-4000-8000-000000000001'
const PLAN = '00000000-0000-4000-8000-000000000002'
const NOW = '2026-05-10T00:00:00.000Z'

const samplePlan = {
  id: PLAN,
  client_id: CLIENT,
  label: 'Block A',
  status: 'active' as const,
  total_weeks: 6,
  week_template: [],
  rationale: null,
  activated_at: NOW,
  created_at: NOW,
  updated_at: NOW,
}

afterEach(() => {
  invalidateCompletedWeeks(PLAN)
  vi.clearAllMocks()
})

describe('completedWeeksResource', () => {
  it('loads weeks and plan and caches by plan alone', async () => {
    const weeks = [{ ...makeWeek(), status: 'completed' as const }]
    listCompletedWeeks.mockResolvedValue(weeks)
    getPlan.mockResolvedValue(samplePlan)

    const first = completedWeeksResource(PLAN)
    const second = completedWeeksResource(PLAN)

    await expect(first).resolves.toEqual({ weeks, plan: samplePlan })
    await expect(second).resolves.toEqual({ weeks, plan: samplePlan })
    expect(listCompletedWeeks).toHaveBeenCalledTimes(1)
    expect(getPlan).toHaveBeenCalledTimes(1)
    expect(getPlan).toHaveBeenCalledWith(PLAN)
  })

  it('drops the cache when the load fails', async () => {
    listCompletedWeeks.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([])
    getPlan.mockResolvedValue(samplePlan)

    await expect(completedWeeksResource(PLAN)).rejects.toThrow('boom')
    await expect(completedWeeksResource(PLAN)).resolves.toEqual({
      weeks: [],
      plan: samplePlan,
    })
    expect(listCompletedWeeks).toHaveBeenCalledTimes(2)
  })
})
