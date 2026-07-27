import { describe, expect, it } from 'vitest'

import { makeWeek } from '@/test/weekFixture'

import { toUpdateDayLog } from './dayLog'

describe('toUpdateDayLog', () => {
  it('maps editable exercise fields to the API contract', () => {
    const day = makeWeek().schedule[0]!
    day.exercises[0]!.feedback = 'easy'
    day.exercises[0]!.sets = [{ performed_reps: 8, performed_weight_kg: 30 }]

    expect(toUpdateDayLog(day)).toEqual({
      completed: false,
      exercises: [
        {
          exercise_key: 'bench_press',
          skipped: false,
          feedback: 'easy',
          sets: [{ performed_reps: 8, performed_weight_kg: 30 }],
        },
      ],
    })
  })

  it('always removes sets from a skipped exercise', () => {
    const day = makeWeek().schedule[0]!
    day.exercises[0]!.skipped = true
    day.exercises[0]!.sets = [{ performed_reps: 8, performed_weight_kg: 30 }]
    expect(toUpdateDayLog(day).exercises[0]!.sets).toEqual([])
  })
})
