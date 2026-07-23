import type { PlanGenerationContext } from '@strengthsync/domain/contracts'

export const CLIENT_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
export const PLAN_ID = '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e'
export const WEEK_ID = '3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f'
export const PROFILE_ID = '4d5e6f7a-8b9c-4d0e-8f2a-3b4c5d6e7f8a'

export function makeWeekTemplate() {
  return [1, 2, 3, 4, 5, 6, 7].map((day_index) => ({
    day_index,
    type: day_index === 7 ? ('rest' as const) : ('upper_body' as const),
    notes: null,
    exercises:
      day_index === 7
        ? []
        : [
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
  }))
}

export function makeWeeklyContext(weekIndex = 1, totalWeeks = 4) {
  const base = initialContext()
  return {
    client: base.client,
    profile: base.profile,
    coaching_rules: base.coaching_rules,
    active_plan: {
      id: PLAN_ID,
      client_id: CLIENT_ID,
      label: 'Block 1',
      status: 'active' as const,
      total_weeks: totalWeeks,
      week_template: makeWeekTemplate(),
      rationale: null,
      activated_at: '2026-07-01T00:00:00.000Z',
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
    },
    week: {
      id: WEEK_ID,
      client_id: CLIENT_ID,
      plan_id: PLAN_ID,
      week_index: weekIndex,
      start_date: '2026-07-01',
      end_date: '2026-07-07',
      status: 'completed' as const,
      schedule: [],
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-07T18:00:00.000Z',
    },
  }
}

export function initialContext(): PlanGenerationContext {
  return {
    client: {
      id: CLIENT_ID,
      coach_id: '00000000-0000-4000-8000-000000000001',
      display_name: 'Ana',
      status: 'active',
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
    },
    profile: {
      id: PROFILE_ID,
      client_id: CLIENT_ID,
      snapshot_date: '2026-07-01',
      sex: 'female',
      age: 34,
      height_cm: 165,
      goals: { primary: 'strength' },
      body_composition: { weight_kg: 62 },
      strength_loads: { press_banca: 60 },
      nutrition: null,
      swimming: null,
      schedule_preferences: { days_per_week: 4 },
      notes: null,
      updated_at: '2026-07-01T00:00:00.000Z',
    },
    active_plan: null,
    completed_weeks: [],
    coaching_rules: 'push weekly',
  }
}
