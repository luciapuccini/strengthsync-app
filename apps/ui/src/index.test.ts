import { describe, expect, it } from 'vitest'

import { toApiError } from './index'
import type { WeekDayHeader } from './index'

describe('@strengthsync/ui', () => {
  it('builds an ApiError from the domain contract', () => {
    expect(toApiError('not_found', 'week not found')).toEqual({
      error: { code: 'not_found', message: 'week not found' },
    })
  })

  it('uses domain day types for presentation', () => {
    const header: WeekDayHeader = { dayIndex: 1, type: 'leg_day' }
    expect(header.type).toBe('leg_day')
  })
})
