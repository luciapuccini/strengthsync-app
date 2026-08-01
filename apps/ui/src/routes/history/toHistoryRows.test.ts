import { describe, expect, it } from 'vitest'

import type { Week } from '@strengthsync/domain/model'

import { makeWeek } from '@/test/weekFixture'

import { HistoryRowSchema, toHistoryRows } from './toHistoryRows'

describe('toHistoryRows', () => {
  it('returns empty for no weeks', () => {
    expect(toHistoryRows([])).toEqual([])
  })

  it('emits one row per exercise with performed series reps and weight', () => {
    const week = makeWeek()
    week.schedule[0]!.exercises[0]!.sets = [
      { performed_reps: 8, performed_weight_kg: 30 },
      { performed_reps: 7, performed_weight_kg: 30 },
    ]

    expect(toHistoryRows([week])).toEqual([
      {
        week: 4,
        date: '2026-07-20',
        day_type: 'upper_body',
        exercise: 'Bench Press',
        series: 2,
        reps: '8, 7',
        weight: '30, 30',
      },
      {
        week: 4,
        date: '2026-07-21',
        day_type: 'rest',
        exercise: '',
        series: null,
        reps: null,
        weight: null,
      },
    ])
  })

  it('emits one empty performed row for days with no exercises', () => {
    const week: Week = {
      ...makeWeek(),
      schedule: [
        {
          day_index: 1,
          date: '2026-07-20',
          type: 'rest',
          notes: null,
          completed: true,
          completed_at: null,
          exercises: [],
        },
      ],
    }

    expect(toHistoryRows([week])).toEqual([
      {
        week: 4,
        date: '2026-07-20',
        day_type: 'rest',
        exercise: '',
        series: null,
        reps: null,
        weight: null,
      },
    ])
  })

  it('preserves week order from the input', () => {
    const newer = { ...makeWeek(), week_index: 5 }
    const older = { ...makeWeek(), week_index: 3 }
    newer.schedule = [{ ...newer.schedule[1]! }]
    older.schedule = [{ ...older.schedule[1]! }]

    expect(toHistoryRows([newer, older]).map((row) => row.week)).toEqual([5, 3])
  })

  it('rejects an invalid history row via Zod', () => {
    expect(() => HistoryRowSchema.parse({ week: 'nope' })).toThrow()
  })
})
