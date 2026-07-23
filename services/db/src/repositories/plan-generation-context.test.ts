import { beforeEach, describe, expect, it } from 'vitest'

import type { PlanDay } from '@strengthsync/domain/model'

import type { Db } from '../db'
import {
  activateGeneratedPlan,
  completeWeek,
  createNextWeek,
  getPlanGenerationContext,
  getWeeklyContext,
} from '../repositories/internal'
import { createClient } from '../repositories/clients'
import { upsertProfile } from '../repositories/profiles'
import { createTestDb, markAllDaysCompleted } from '../testing/index'

const weekTemplate: PlanDay[] = [
  {
    day_index: 1,
    type: 'upper_body',
    notes: null,
    exercises: [
      {
        exercise_key: 'press_banca',
        name: 'Bench press',
        series: 4,
        reps: 8,
        rest_time_sec: 120,
        weight_kg: 60,
        notes: null,
      },
    ],
  },
  { day_index: 3, type: 'rest', notes: null, exercises: [] },
]

const profileInput = {
  snapshot_date: '2026-07-01',
  sex: 'female',
  age: 34,
  height_cm: 165,
  goals: { primary: 'strength' },
  body_composition: { weight_kg: 62 },
  strength_loads: { press_banca: 60 },
  nutrition: { calories: 2100 },
  swimming: null,
  schedule_preferences: { days_per_week: 4 },
  notes: null,
}

let db: Db
let clientId: string

beforeEach(async () => {
  db = createTestDb()
  const client = await createClient(db, { display_name: 'Ana' })
  clientId = client.id
})

describe('plan-generation context', () => {
  it('includes coaching rules after the active plan is fully completed', async () => {
    await upsertProfile(db, clientId, profileInput)
    const { plan, first_week } = await activateGeneratedPlan(db, clientId, {
      workflow_id: 'wf-activate-1',
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    })
    await markAllDaysCompleted(db, clientId, first_week.id)
    await completeWeek(db, clientId, first_week.id)

    const weekly = await getWeeklyContext(db, clientId, first_week.id)
    expect(weekly.active_plan.id).toBe(plan.id)

    const week2 = await createNextWeek(db, clientId, {
      workflow_id: 'wf-week-2-for-context',
      previous_week_id: first_week.id,
      schedule: first_week.schedule,
    })
    await markAllDaysCompleted(db, clientId, week2.id)
    await completeWeek(db, clientId, week2.id)

    const forGeneration = await getPlanGenerationContext(db, clientId)
    expect(forGeneration.active_plan?.id).toBe(plan.id)
    expect(forGeneration.completed_weeks.map((w) => w.id)).toEqual([first_week.id, week2.id])
    expect(forGeneration.coaching_rules).toContain('pushed weekly')
  })

  it('allows a first plan with no active plan', async () => {
    await upsertProfile(db, clientId, profileInput)
    const context = await getPlanGenerationContext(db, clientId)
    expect(context.active_plan).toBeNull()
    expect(context.completed_weeks).toEqual([])
  })

  it('rejects an unfinished active plan', async () => {
    await upsertProfile(db, clientId, profileInput)
    const { first_week } = await activateGeneratedPlan(db, clientId, {
      workflow_id: 'wf-activate-1',
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    })

    await expect(getPlanGenerationContext(db, clientId)).rejects.toMatchObject({
      code: 'plan_not_complete',
    })
    await markAllDaysCompleted(db, clientId, first_week.id)
    await completeWeek(db, clientId, first_week.id)
    await expect(getPlanGenerationContext(db, clientId)).rejects.toMatchObject({
      code: 'plan_not_complete',
    })
  })
})
