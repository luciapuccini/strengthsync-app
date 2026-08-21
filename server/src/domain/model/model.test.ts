import { describe, expect, it } from 'vitest';

import {
  ClientProfileSchema,
  ExerciseLogSchema,
  type ExerciseLog,
  PerformedSetSchema,
  PlannedExerciseSchema,
  WeekSchema,
  PlanSchema,
  type PlanDay,
  type WeekDay,
} from './index';

const planDay: PlanDay = {
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
      weight_lb: 60,
      notes: null,
    },
  ],
};

const benchLog: ExerciseLog = {
  exercise_key: 'press_banca',
  name: 'Bench press',
  skipped: false,
  feedback: null,
  prescribed: {
    series: 4,
    reps: 8,
    rest_time_sec: 120,
    weight_lb: 60,
    notes: null,
  },
  sets: [],
};

const weekDay: WeekDay = {
  day_index: 1,
  date: '2026-07-20',
  type: 'upper_body',
  notes: null,
  completed: false,
  completed_at: null,
  exercises: [benchLog],
};

describe('PlanSchema', () => {
  it('accepts a valid plan', () => {
    const plan = {
      id: '0f5c8b4a-2d3e-4f5a-8b9c-1d2e3f4a5b6c',
      client_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      label: 'Block 1',
      status: 'active',
      total_weeks: 6,
      week_template: [planDay],
      rationale: null,
      activated_at: '2026-07-20T08:00:00.000Z',
      created_at: '2026-07-19T12:00:00.000Z',
      updated_at: '2026-07-20T08:00:00.000Z',
    };

    expect(PlanSchema.parse(plan)).toEqual(plan);
  });

  it('rejects a day_index outside 1–7', () => {
    const result = PlanSchema.safeParse({
      id: '0f5c8b4a-2d3e-4f5a-8b9c-1d2e3f4a5b6c',
      client_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      label: 'Block 1',
      status: 'draft',
      total_weeks: 6,
      week_template: [{ ...planDay, day_index: 8 }],
      rationale: null,
      activated_at: null,
      created_at: '2026-07-19T12:00:00.000Z',
      updated_at: '2026-07-19T12:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });
});

describe('WeekSchema', () => {
  it('accepts a valid in-flight week', () => {
    const week = {
      id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
      client_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      plan_id: '0f5c8b4a-2d3e-4f5a-8b9c-1d2e3f4a5b6c',
      week_index: 1,
      start_date: '2026-07-20',
      end_date: '2026-07-26',
      status: 'in_flight',
      schedule: [weekDay],
      created_at: '2026-07-20T08:00:00.000Z',
      updated_at: '2026-07-20T08:00:00.000Z',
    };

    expect(WeekSchema.parse(week)).toEqual(week);
  });

  it('rejects an invalid exercise feedback value', () => {
    const result = WeekSchema.safeParse({
      id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
      client_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      plan_id: '0f5c8b4a-2d3e-4f5a-8b9c-1d2e3f4a5b6c',
      week_index: 1,
      start_date: '2026-07-20',
      end_date: '2026-07-26',
      status: 'in_flight',
      schedule: [
        {
          ...weekDay,
          exercises: [{ ...benchLog, feedback: 'meh' }],
        },
      ],
      created_at: '2026-07-20T08:00:00.000Z',
      updated_at: '2026-07-20T08:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a malformed ISO date', () => {
    const result = WeekSchema.safeParse({
      id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
      client_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      plan_id: '0f5c8b4a-2d3e-4f5a-8b9c-1d2e3f4a5b6c',
      week_index: 1,
      start_date: '20/07/2026',
      end_date: '2026-07-26',
      status: 'in_flight',
      schedule: [weekDay],
      created_at: '2026-07-20T08:00:00.000Z',
      updated_at: '2026-07-20T08:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });
});

describe('ClientProfileSchema', () => {
  it('accepts nested objects and arrays in json record fields', () => {
    const profile = {
      id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
      client_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      snapshot_date: '2026-07-20',
      sex: 'female',
      age: 34,
      height_in: 65,
      goals: { primary: 'strength' },
      body_composition: {
        current_may_2026: { weight_lb: 60, body_fat_pct: 18 },
        baseline_feb_2026: { weight_lb: 62, body_fat_pct: 20 },
        first_block_changes: { weight_lb: -2, body_fat_pct: -2 },
      },
      strength_loads: {
        upper_body: { press_banca_lb: 145 },
        lower_body: { squat: 80 },
      },
      nutrition: {
        daily_targets: { calories: 2100, protein_g: 130 },
        meal_schedule: { breakfast: '08:00' },
        cheat_meal_examples: ['pizza', 'burger'],
        supplements: { pre_workout: true },
      },
      activities: {
        items: [
          {
            name: 'swimming',
            sessions_per_week: 2,
            days: ['wednesday', 'friday'],
            note: 'Endurance session, 30 min.',
          },
        ],
      },
      schedule_preferences: {
        weekly_schedule: { monday: 'upper_body', wednesday: 'lower_body' },
      },
      notes: null,
      updated_at: '2026-07-20T08:00:00.000Z',
    };

    expect(ClientProfileSchema.parse(profile)).toEqual(profile);
  });
});

describe('the five-pound grid', () => {
  const prescribedAt = (weight_lb: number | null): ExerciseLog => ({
    ...benchLog,
    prescribed: { ...benchLog.prescribed, weight_lb },
  });

  it('corrects an off-grid prescribed load to the nearest five', () => {
    expect(ExerciseLogSchema.parse(prescribedAt(137)).prescribed.weight_lb).toBe(135);
    expect(ExerciseLogSchema.parse(prescribedAt(138)).prescribed.weight_lb).toBe(140);
  });

  it('leaves an already-gridded load untouched', () => {
    expect(ExerciseLogSchema.parse(prescribedAt(135)).prescribed.weight_lb).toBe(135);
  });

  it('keeps a null load null', () => {
    expect(ExerciseLogSchema.parse(prescribedAt(null)).prescribed.weight_lb).toBeNull();
  });

  it('snaps a performed load', () => {
    expect(PerformedSetSchema.parse({ performed_reps: 8, performed_weight_lb: 132 })).toEqual({
      performed_reps: 8,
      performed_weight_lb: 130,
    });
  });

  it('never rejects an off-grid load', () => {
    const result = PlannedExerciseSchema.safeParse({
      ...planDay.exercises[0],
      weight_lb: 137.5,
    });

    expect(result.success).toBe(true);
    expect(result.data?.weight_lb).toBe(140);
  });

  it('reaches loads nested inside a stored week', () => {
    const week = WeekSchema.parse({
      id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
      client_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      plan_id: '0f5c8b4a-2d3e-4f5a-8b9c-1d2e3f4a5b6c',
      week_index: 1,
      start_date: '2026-07-20',
      end_date: '2026-07-26',
      status: 'in_flight',
      schedule: [{ ...weekDay, exercises: [prescribedAt(137)] }],
      created_at: '2026-07-20T08:00:00.000Z',
      updated_at: '2026-07-20T08:00:00.000Z',
    });

    expect(week.schedule[0]?.exercises[0]?.prescribed.weight_lb).toBe(135);
  });
});
