import { describe, expect, it } from 'vitest'

import { formatIsoDate } from './formatIsoDate'

describe('formatIsoDate', () => {
  it('formats YYYY-MM-DD as DD/MM/YYYY', () => {
    expect(formatIsoDate('2026-07-20')).toBe('20/07/2026')
    expect(formatIsoDate('2026-01-05')).toBe('05/01/2026')
  })

  it('rejects a non ISO calendar date', () => {
    expect(() => formatIsoDate('20-07-2026')).toThrow()
  })
})
