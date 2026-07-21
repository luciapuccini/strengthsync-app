import { describe, expect, it } from 'vitest'

import type { WeekRowPreview } from './index'

describe('@strengthsync/db', () => {
  it('row preview maps domain week status', () => {
    const row: WeekRowPreview = {
      id: 'week-1',
      status: 'in_flight',
      schedule_json: '[]',
    }

    expect(row.status).toBe('in_flight')
  })
})
