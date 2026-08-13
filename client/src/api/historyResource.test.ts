import { afterEach, describe, expect, it, vi } from 'vitest'

import { makeWeek } from '@/test/weekFixture'

const { listCompletedWeeks, getActivePlan } = vi.hoisted(() => ({
  listCompletedWeeks: vi.fn(),
  getActivePlan: vi.fn(),
}))

vi.mock('@/api/client', () => ({ listCompletedWeeks, getActivePlan }))

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
  invalidateCompletedWeeks()
  vi.clearAllMocks()
})

describe('completedWeeksResource', () => {
  it('resolves the active plan itself and reads that plan\'s completed weeks', async () => {
    const weeks = [{ ...makeWeek(), status: 'completed' as const }]
    getActivePlan.mockResolvedValue(samplePlan)
    listCompletedWeeks.mockResolvedValue(weeks)

    await expect(completedWeeksResource()).resolves.toEqual({ weeks, plan: samplePlan })
    expect(listCompletedWeeks).toHaveBeenCalledWith(PLAN)
  })

  it('caches, so a second read does not refetch', async () => {
    getActivePlan.mockResolvedValue(samplePlan)
    listCompletedWeeks.mockResolvedValue([])

    const first = completedWeeksResource()
    const second = completedWeeksResource()

    await Promise.all([first, second])
    expect(first).toBe(second)
    expect(getActivePlan).toHaveBeenCalledTimes(1)
    expect(listCompletedWeeks).toHaveBeenCalledTimes(1)
  })

  it('reports no plan and no weeks when nothing is active, without asking for weeks', async () => {
    getActivePlan.mockResolvedValue(null)

    await expect(completedWeeksResource()).resolves.toEqual({ weeks: [], plan: null })
    expect(listCompletedWeeks).not.toHaveBeenCalled()
  })

  it('drops the cache when the load fails', async () => {
    getActivePlan.mockResolvedValue(samplePlan)
    listCompletedWeeks.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([])

    await expect(completedWeeksResource()).rejects.toThrow('boom')
    await expect(completedWeeksResource()).resolves.toEqual({ weeks: [], plan: samplePlan })
    expect(listCompletedWeeks).toHaveBeenCalledTimes(2)
  })
})
