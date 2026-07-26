import { beforeEach, describe, expect, it } from 'vitest'

import type { PlanDay } from '@strengthsync/domain/model'

import type { Db } from '../db'
import { RepoError } from '../errors'
import {
  activateGeneratedPlan,
  completeWeek,
  createNextWeek,
} from '../repositories/internal'
import { createClient } from '../repositories/clients'
import { upsertProfile } from '../repositories/profiles'
import { getWeek, listWeeks } from '../repositories/weeks'
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

async function activateAndCompleteFirstWeek() {
  const { plan, first_week } = await activateGeneratedPlan(db, clientId, {
    workflow_id: 'wf-activate-1',
    plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
  })
  await upsertProfile(db, clientId, profileInput)
  await markAllDaysCompleted(db, clientId, first_week.id)
  await completeWeek(db, clientId, first_week.id)
  return { plan, first_week }
}

describe('completeWeek command', () => {
  it('completes a week with incomplete days', async () => {
    const { first_week } = await activateGeneratedPlan(db, clientId, {
      workflow_id: 'wf-activate-1',
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    })
    const completed = await completeWeek(db, clientId, first_week.id)
    expect(completed.status).toBe('completed')
    expect(completed.schedule.some((day) => !day.completed)).toBe(true)
  })

  it('is idempotent', async () => {
    const { first_week } = await activateAndCompleteFirstWeek()
    const again = await completeWeek(db, clientId, first_week.id)
    expect(again.status).toBe('completed')
    expect(again.id).toBe(first_week.id)
  })

  it('rejects a non-current week', async () => {
    const { plan } = await activateGeneratedPlan(db, clientId, {
      workflow_id: 'wf-activate-1',
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    })
    await expect(completeWeek(db, clientId, plan.id)).rejects.toThrow(RepoError)
  })
})

describe('createNextWeek command', () => {
  it('rolls dates forward and is idempotent by workflow_id', async () => {
    const { first_week } = await activateAndCompleteFirstWeek()

    const next = await createNextWeek(db, clientId, {
      workflow_id: 'wf-week-2',
      previous_week_id: first_week.id,
      schedule: first_week.schedule,
    })
    expect(next.week_index).toBe(2)
    expect(next.start_date > first_week.start_date).toBe(true)
    expect(next.status).toBe('in_flight')

    const duplicate = await createNextWeek(db, clientId, {
      workflow_id: 'wf-week-2',
      previous_week_id: first_week.id,
      schedule: first_week.schedule,
    })
    expect(duplicate.id).toBe(next.id)
    expect(await listWeeks(db, clientId)).toHaveLength(2)
  })

  it('refuses beyond the plan boundary', async () => {
    const { first_week } = await activateAndCompleteFirstWeek()
    const week2 = await createNextWeek(db, clientId, {
      workflow_id: 'wf-week-2',
      previous_week_id: first_week.id,
      schedule: first_week.schedule,
    })
    await markAllDaysCompleted(db, clientId, week2.id)
    await completeWeek(db, clientId, week2.id)

    await expect(
      createNextWeek(db, clientId, {
        workflow_id: 'wf-week-3',
        previous_week_id: week2.id,
        schedule: week2.schedule,
      }),
    ).rejects.toThrow(/plan_complete|total_weeks|no next week/i)
  })

  it('refuses a second in_flight week under a different workflow_id', async () => {
    const { first_week } = await activateAndCompleteFirstWeek()
    await createNextWeek(db, clientId, {
      workflow_id: 'wf-week-2',
      previous_week_id: first_week.id,
      schedule: first_week.schedule,
    })

    await expect(
      createNextWeek(db, clientId, {
        workflow_id: 'wf-week-2-conflict',
        previous_week_id: first_week.id,
        schedule: first_week.schedule,
      }),
    ).rejects.toThrow()
  })
})

describe('week ownership', () => {
  it('getWeek scopes reads to the owning client', async () => {
    const { first_week } = await activateGeneratedPlan(db, clientId, {
      workflow_id: 'wf-activate-1',
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    })
    const other = await createClient(db, { display_name: 'Other' })
    expect(await getWeek(db, other.id, first_week.id)).toBeNull()
  })
})
