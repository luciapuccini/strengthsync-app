export const CLIENT_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
export const PLAN_ID = '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e'
export const WEEK_ID = '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f'

export const PROFILE = {
  id: CLIENT_ID,
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
}

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

export function makeSchedule(startDate: string, completed: boolean) {
  return [1, 2, 3, 4, 5, 6, 7].map((day_index) => {
    const date = new Date(`${startDate}T00:00:00.000Z`)
    date.setUTCDate(date.getUTCDate() + day_index - 1)
    return {
      day_index,
      date: date.toISOString().slice(0, 10),
      type: day_index === 7 ? ('rest' as const) : ('upper_body' as const),
      notes: null,
      completed,
      completed_at: completed ? '2026-07-07T18:00:00.000Z' : null,
      exercises:
        day_index === 7
          ? []
          : [
              {
                exercise_key: 'press_banca',
                name: 'Bench press',
                skipped: false,
                feedback: completed ? ('hard' as const) : null,
                prescribed: {
                  series: 4,
                  reps: 8,
                  rest_time_sec: 120,
                  weight_kg: 60,
                  notes: null,
                },
                sets: completed
                  ? [
                      { performed_reps: 8, performed_weight_kg: 60 },
                      { performed_reps: 8, performed_weight_kg: 60 },
                      { performed_reps: 8, performed_weight_kg: 60 },
                      { performed_reps: 8, performed_weight_kg: 60 },
                    ]
                  : [],
              },
            ],
    }
  })
}

export function makePlan() {
  return {
    id: PLAN_ID,
    client_id: CLIENT_ID,
    label: 'Block 1',
    status: 'active' as const,
    total_weeks: 4,
    week_template: makeWeekTemplate(),
    rationale: null,
    activated_at: '2026-07-01T00:00:00.000Z',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
  }
}

export function makeWeek() {
  return {
    id: WEEK_ID,
    client_id: CLIENT_ID,
    plan_id: PLAN_ID,
    week_index: 1,
    start_date: '2026-07-01',
    end_date: '2026-07-07',
    status: 'completed' as const,
    schedule: makeSchedule('2026-07-01', true),
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-07T18:00:00.000Z',
  }
}
