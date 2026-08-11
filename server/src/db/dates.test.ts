import { describe, expect, it } from 'vitest'

import { addDays, startOfISOWeek } from './dates'

describe('addDays', () => {
  it('adds days within a week', () => {
    expect(addDays('2026-07-20', 6)).toBe('2026-07-26')
  })

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('startOfISOWeek', () => {
  it('returns the same day for a Monday', () => {
    expect(startOfISOWeek('2026-07-20')).toBe('2026-07-20')
  })

  it('returns the previous Monday for mid-week days', () => {
    expect(startOfISOWeek('2026-07-22')).toBe('2026-07-20')
  })

  it('returns the previous Monday for a Sunday', () => {
    expect(startOfISOWeek('2026-07-26')).toBe('2026-07-20')
  })
})
