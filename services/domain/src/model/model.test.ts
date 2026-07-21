import { describe, expect, it } from 'vitest'

import type { DayType, ExerciseFeedback, WeekStatus } from './index'

describe('@strengthsync/domain model', () => {
  it('exposes the core domain unions', () => {
    const day: DayType = 'upper_body'
    const feedback: ExerciseFeedback = 'hard'
    const status: WeekStatus = 'in_flight'

    expect(day).toBe('upper_body')
    expect(feedback).toBe('hard')
    expect(status).toBe('in_flight')
  })
})
