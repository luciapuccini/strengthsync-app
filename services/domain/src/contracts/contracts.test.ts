import { describe, expect, it } from 'vitest'

import {
  GeneratedPlanInputSchema,
  SaveDayLogSchema,
  UpdateDayLogSchema,
} from './index'

describe('UpdateDayLogSchema', () => {
  it('accepts a day log with performed sets', () => {
    const log = {
      completed: true,
      exercises: [
        {
          exercise_key: 'press_banca',
          skipped: false,
          feedback: 'hard',
          sets: [
            { performed_reps: 8, performed_weight_kg: 60 },
            { performed_reps: 7, performed_weight_kg: 60 },
          ],
        },
      ],
    }

    expect(UpdateDayLogSchema.parse(log)).toEqual(log)
  })

  it('rejects a skipped exercise with performed sets', () => {
    const result = UpdateDayLogSchema.safeParse({
      completed: false,
      exercises: [
        {
          exercise_key: 'press_banca',
          skipped: true,
          feedback: null,
          sets: [{ performed_reps: 8, performed_weight_kg: 60 }],
        },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('accepts a skipped exercise with empty sets', () => {
    const result = UpdateDayLogSchema.safeParse({
      completed: false,
      exercises: [{ exercise_key: 'press_banca', skipped: true, feedback: null, sets: [] }],
    })

    expect(result.success).toBe(true)
  })
})

describe('SaveDayLogSchema', () => {
  it('accepts exercises only and strips unknown keys', () => {
    const exercises = [
      {
        exercise_key: 'press_banca',
        skipped: false,
        feedback: 'hard' as const,
        sets: [{ performed_reps: 8, performed_weight_kg: 60 }],
      },
    ]

    expect(
      SaveDayLogSchema.parse({
        completed: false,
        exercises,
        extra: 'drop-me',
      }),
    ).toEqual({ exercises })
  })

  it('rejects a skipped exercise with performed sets', () => {
    const result = SaveDayLogSchema.safeParse({
      exercises: [
        {
          exercise_key: 'press_banca',
          skipped: true,
          feedback: null,
          sets: [{ performed_reps: 8, performed_weight_kg: 60 }],
        },
      ],
    })

    expect(result.success).toBe(false)
  })
})

describe('GeneratedPlanInputSchema', () => {
  it('accepts a generated plan with null rationale', () => {
    const result = GeneratedPlanInputSchema.safeParse({
      label: 'Block 2',
      total_weeks: 4,
      week_template: [],
      rationale: null,
    })

    expect(result.success).toBe(true)
  })
})


