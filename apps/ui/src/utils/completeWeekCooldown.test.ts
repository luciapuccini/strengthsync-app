import { afterEach, describe, expect, it } from 'vitest'

import {
  COMPLETE_WEEK_COOLDOWN_MS,
  completeWeekCooldownRemaining,
  startCompleteWeekCooldown,
} from './completeWeekCooldown'

const CLIENT_ID = 'client-1'
const NOW = 1_785_000_000_000
const STORAGE_KEY = `strengthsync:complete-week-cooldown:${CLIENT_ID}`

afterEach(() => {
  window.localStorage.clear()
})

describe('complete week cooldown', () => {
  it('persists a seven-day cooldown per client', () => {
    expect(startCompleteWeekCooldown(CLIENT_ID, NOW)).toBe(COMPLETE_WEEK_COOLDOWN_MS)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(String(NOW))
    expect(completeWeekCooldownRemaining(CLIENT_ID, NOW)).toBe(COMPLETE_WEEK_COOLDOWN_MS)
  })

  it('clears an expired cooldown', () => {
    window.localStorage.setItem(STORAGE_KEY, String(NOW - COMPLETE_WEEK_COOLDOWN_MS))

    expect(completeWeekCooldownRemaining(CLIENT_ID, NOW)).toBe(0)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears malformed stored values', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not-a-timestamp')

    expect(completeWeekCooldownRemaining(CLIENT_ID, NOW)).toBe(0)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
