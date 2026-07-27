import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Client } from '@strengthsync/domain/model'

import { makeWeek } from '@/test/weekFixture'

const { saveDayLog } = vi.hoisted(() => ({ saveDayLog: vi.fn() }))
const { invalidateCurrentWeek, currentWeekResource } = vi.hoisted(() => ({
  invalidateCurrentWeek: vi.fn(),
  currentWeekResource: vi.fn(),
}))

vi.mock('@/api/client', () => ({ saveDayLog }))
vi.mock('@/api/weekResource', () => ({ invalidateCurrentWeek, currentWeekResource }))

import { useAppStore } from '../useAppStore'

const UUID = '00000000-0000-4000-8000-000000000001'
const NOW = '2026-07-23T00:00:00.000Z'

const client: Client = {
  id: UUID,
  coach_id: UUID,
  display_name: 'Lucia',
  status: 'active',
  created_at: NOW,
  updated_at: NOW,
}

beforeEach(() => {
  useAppStore.setState({ client: null, plan: null, week: null, selectedClientId: null }, false)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('trackerSlice', () => {
  it('hydrates client/plan/week from a resolved resource', () => {
    const week = makeWeek()
    useAppStore.getState().hydrateTracker({ client, plan: null, week })

    expect(useAppStore.getState().client).toEqual(client)
    expect(useAppStore.getState().week).toEqual(week)
  })

  it('delegates toggleSet/toggleSkip/setFeedback to the pure week transitions', () => {
    const week = makeWeek()
    useAppStore.getState().hydrateTracker({ client, plan: null, week })

    useAppStore.getState().toggleSet(1, 'bench_press', 0)
    expect(useAppStore.getState().week?.schedule[0]?.exercises[0]?.sets).toEqual([
      { performed_reps: 8, performed_weight_kg: 30 },
    ])

    useAppStore.getState().toggleSkip(1, 'bench_press')
    expect(useAppStore.getState().week?.schedule[0]?.exercises[0]?.skipped).toBe(true)

    useAppStore.getState().setFeedback(1, 'bench_press', 'heavy')
    expect(useAppStore.getState().week?.schedule[0]?.exercises[0]?.feedback).toBe('heavy')
  })

  it('is a no-op mutating sets/feedback before the tracker is hydrated', () => {
    useAppStore.getState().toggleSet(1, 'bench_press', 0)
    expect(useAppStore.getState().week).toBeNull()
  })

  it('saveDay persists the day, invalidates the cache, and re-hydrates the week', async () => {
    const week = makeWeek()
    const savedWeek = { ...week, schedule: [{ ...week.schedule[0]!, completed: true }, week.schedule[1]!] }
    useAppStore.getState().hydrateTracker({ client, plan: null, week })
    saveDayLog.mockResolvedValue(savedWeek)

    await useAppStore.getState().saveDay(week.schedule[0]!)

    expect(saveDayLog).toHaveBeenCalledWith(client.id, week.id, 1, expect.any(Object))
    expect(invalidateCurrentWeek).toHaveBeenCalledWith(client.id)
    expect(useAppStore.getState().week).toEqual(savedWeek)
  })

  it('saveDay rejects before the tracker is hydrated', async () => {
    await expect(useAppStore.getState().saveDay(makeWeek().schedule[0]!)).rejects.toThrow()
  })

  it('refreshTracker invalidates and re-hydrates from the resource cache', async () => {
    const week = makeWeek()
    useAppStore.getState().hydrateTracker({ client, plan: null, week })
    const refreshed = { client, plan: null, week: { ...week, week_index: 5 } }
    currentWeekResource.mockResolvedValue(refreshed)

    await useAppStore.getState().refreshTracker()

    expect(invalidateCurrentWeek).toHaveBeenCalledWith(client.id)
    expect(currentWeekResource).toHaveBeenCalledWith(client.id)
    expect(useAppStore.getState().week).toEqual(refreshed.week)
  })

  it('refreshTracker is a no-op without a hydrated client', async () => {
    await useAppStore.getState().refreshTracker()
    expect(currentWeekResource).not.toHaveBeenCalled()
  })
})
