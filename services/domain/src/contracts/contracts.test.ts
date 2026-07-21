import { describe, expect, it } from 'vitest'

import {
  CreateNextWeekCommandSchema,
  GeneratedPlanInputSchema,
  UpdateDayLogSchema,
  WorkflowStatusSchema,
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

describe('GeneratedPlanInputSchema', () => {
  it('accepts a generated plan without rationale', () => {
    const result = GeneratedPlanInputSchema.safeParse({
      label: 'Block 2',
      total_weeks: 4,
      week_template: [],
    })

    expect(result.success).toBe(true)
  })
})

describe('CreateNextWeekCommandSchema', () => {
  it('rejects a non-uuid previous_week_id', () => {
    const result = CreateNextWeekCommandSchema.safeParse({
      workflow_id: 'weekly-progression:client:week',
      previous_week_id: 'not-a-uuid',
      schedule: [],
    })

    expect(result.success).toBe(false)
  })
})

describe('WorkflowStatusSchema', () => {
  it('accepts a running status without result fields', () => {
    const result = WorkflowStatusSchema.safeParse({
      workflow_id: 'weekly-progression:client:week',
      type: 'weekly_progression',
      status: 'running',
      started_at: '2026-07-21T08:00:00.000Z',
    })

    expect(result.success).toBe(true)
  })

  it('rejects a failed status without an error', () => {
    const result = WorkflowStatusSchema.safeParse({
      workflow_id: 'weekly-progression:client:week',
      type: 'weekly_progression',
      status: 'failed',
      started_at: '2026-07-21T08:00:00.000Z',
      finished_at: '2026-07-21T08:01:00.000Z',
    })

    expect(result.success).toBe(false)
  })
})
