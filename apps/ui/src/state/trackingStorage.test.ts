import { describe, expect, it, vi } from 'vitest'

import { makeWeek } from '@/test/weekFixture'

import {
  loadTrackingDraft,
  parseTrackingDraft,
  saveTrackingDraft,
  serializeTrackingDraft,
  trackingStorageKey,
} from './trackingStorage'

describe('trackingStorage', () => {
  it('round-trips a matching draft', () => {
    const week = makeWeek()
    expect(parseTrackingDraft(serializeTrackingDraft(week), week)).toEqual(week)
  })

  it('ignores malformed, mismatched, and stale drafts', () => {
    const week = makeWeek()
    expect(parseTrackingDraft('{', week)).toBeNull()

    const otherWeek = { ...week, id: '00000000-0000-4000-8000-000000000002' }
    expect(parseTrackingDraft(serializeTrackingDraft(otherWeek), week)).toBeNull()

    const staleWeek = { ...week, updated_at: '2026-07-22T00:00:00.000Z' }
    expect(parseTrackingDraft(serializeTrackingDraft(staleWeek), week)).toBeNull()
  })

  it('uses a per-week storage key and tolerates unavailable storage', () => {
    const week = makeWeek()
    const setItem = vi.fn()
    saveTrackingDraft(week, { setItem })
    expect(setItem).toHaveBeenCalledWith(
      trackingStorageKey(week.id),
      serializeTrackingDraft(week),
    )

    expect(
      loadTrackingDraft(week, {
        getItem: () => {
          throw new Error('unavailable')
        },
      }),
    ).toBeNull()
  })
})
