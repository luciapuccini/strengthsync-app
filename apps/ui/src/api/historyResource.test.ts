import { afterEach, describe, expect, it, vi } from 'vitest'

import { makeWeek } from '@/test/weekFixture'

const { listCompletedWeeks } = vi.hoisted(() => ({
  listCompletedWeeks: vi.fn(),
}))

vi.mock('@/api/client', () => ({ listCompletedWeeks }))

import { completedWeeksResource, invalidateCompletedWeeks } from './historyResource'

const CLIENT = '00000000-0000-4000-8000-000000000001'
const PLAN = '00000000-0000-4000-8000-000000000002'

afterEach(() => {
  invalidateCompletedWeeks(CLIENT, PLAN)
  vi.clearAllMocks()
})

describe('completedWeeksResource', () => {
  it('loads completed weeks and caches by client and plan', async () => {
    const weeks = [{ ...makeWeek(), status: 'completed' as const }]
    listCompletedWeeks.mockResolvedValue(weeks)

    const first = completedWeeksResource(CLIENT, PLAN)
    const second = completedWeeksResource(CLIENT, PLAN)

    await expect(first).resolves.toEqual(weeks)
    await expect(second).resolves.toEqual(weeks)
    expect(listCompletedWeeks).toHaveBeenCalledTimes(1)
    expect(listCompletedWeeks).toHaveBeenCalledWith(CLIENT, PLAN)
  })

  it('drops the cache when the load fails', async () => {
    listCompletedWeeks.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([])

    await expect(completedWeeksResource(CLIENT, PLAN)).rejects.toThrow('boom')
    await expect(completedWeeksResource(CLIENT, PLAN)).resolves.toEqual([])
    expect(listCompletedWeeks).toHaveBeenCalledTimes(2)
  })
})
