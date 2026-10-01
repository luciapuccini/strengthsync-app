import { describe, expect, it } from 'vitest';

import type { Plan, Week } from '@/api/types';

import { makeWeek } from '@/test/weekFixture';

import { toHistoryCsv } from './toHistoryCsv';

type PlannedExercise = Plan['week_template'][number]['exercises'][number];
type WeekExercise = Week['schedule'][number]['exercises'][number];
type PerformedSet = WeekExercise['sets'][number];

const BOM = '\uFEFF';

function planned(exercise_key: string, name: string, weight_lb: number | null): PlannedExercise {
  return { exercise_key, name, series: 4, reps: 10, rest_time_sec: 90, weight_lb, notes: null };
}

function makePlan(): Plan {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    client_id: '00000000-0000-4000-8000-000000000001',
    label: 'Strength block',
    status: 'active',
    total_weeks: 6,
    rationale: null,
    activated_at: null,
    created_at: '2025-12-15T00:00:00.000Z',
    updated_at: '2025-12-15T00:00:00.000Z',
    week_template: [
      {
        day_index: 1,
        type: 'upper_body',
        notes: null,
        exercises: [
          planned('bench_press', 'Bench press', 15),
          { ...planned('face_pull', 'Face pull', 7), series: 3, reps: 12 },
        ],
      },
      { day_index: 2, type: 'leg_day', notes: null, exercises: [planned('squat', 'Squat', 30)] },
      { day_index: 3, type: 'rest', notes: null, exercises: [] },
    ],
  };
}

function sets(count: number, reps: number, weight: number | null): PerformedSet[] {
  return Array.from({ length: count }, () => ({
    performed_reps: reps,
    performed_weight_lb: weight,
  }));
}

function performed(exercise_key: string, name: string, done: PerformedSet[]): WeekExercise {
  return {
    exercise_key,
    name,
    skipped: done.length === 0,
    feedback: null,
    prescribed: { series: 4, reps: 10, rest_time_sec: 90, weight_lb: null, notes: null },
    sets: done,
  };
}

function weekWith(
  week_index: number,
  start_date: string,
  days: Record<number, WeekExercise[]>,
): Week {
  const base = makeWeek();
  return {
    ...base,
    week_index,
    start_date,
    status: 'completed',
    schedule: Object.entries(days).map(([dayIndex, exercises]) => ({
      day_index: Number(dayIndex),
      date: start_date,
      type: Number(dayIndex) === 2 ? 'leg_day' : 'upper_body',
      notes: null,
      completed: true,
      completed_at: null,
      exercises,
    })),
  };
}

const WEEK_1 = weekWith(1, '2025-12-15', {
  1: [
    performed('bench_press', 'Bench press', sets(4, 10, 15)),
    performed('face_pull', 'Face pull', []),
  ],
  2: [performed('squat', 'Squat', sets(4, 10, 30))],
});

const WEEK_2 = weekWith(2, '2025-12-22', {
  1: [
    performed('bench_press', 'Bench press', sets(4, 10, 20)),
    performed('face_pull', 'Face pull', sets(3, 12, 7)),
  ],
  2: [performed('squat', 'Squat', sets(4, 10, 33))],
});

function rows(csv: string): string[] {
  return csv.replace(BOM, '').split('\r\n');
}

describe('toHistoryCsv', () => {
  it('writes the template rows and no week columns when there are no weeks', () => {
    expect(rows(toHistoryCsv([], makePlan(), 'metric'))).toEqual([
      ',,,,',
      'Day 1 - Upper body,,,,',
      'Exercise,Series,Reps,Rest (s),Base weight (kg)',
      'Bench press,4,10,90,7',
      'Face pull,3,12,90,3',
      ',,,,',
      'Day 2 - Leg day,,,,',
      'Exercise,Series,Reps,Rest (s),Base weight (kg)',
      'Squat,4,10,90,14',
      ',,,,',
    ]);
  });

  it('matches the target layout for two metric weeks', () => {
    expect(rows(toHistoryCsv([WEEK_1, WEEK_2], makePlan(), 'metric'))).toEqual([
      ',,,,,S1 - 15/12/2025,,,S2 - 22/12/2025,,',
      'Day 1 - Upper body,,,,,,,,,,',
      'Exercise,Series,Reps,Rest (s),Base weight (kg),S1 - series,S1 - reps,S1 - weight (kg),S2 - series,S2 - reps,S2 - weight (kg)',
      'Bench press,4,10,90,7,4,10,7,4,10,9',
      'Face pull,3,12,90,3,,,,3,12,3',
      ',,,,,,,,,,',
      'Day 2 - Leg day,,,,,,,,,,',
      'Exercise,Series,Reps,Rest (s),Base weight (kg),S1 - series,S1 - reps,S1 - weight (kg),S2 - series,S2 - reps,S2 - weight (kg)',
      'Squat,4,10,90,14,4,10,14,4,10,15',
      ',,,,,,,,,,',
    ]);
  });

  it('keeps pounds and labels lb for imperial', () => {
    const lines = rows(toHistoryCsv([WEEK_1], makePlan(), 'imperial'));
    expect(lines[2]).toBe(
      'Exercise,Series,Reps,Rest (s),Base weight (lb),S1 - series,S1 - reps,S1 - weight (lb)',
    );
    expect(lines[3]).toBe('Bench press,4,10,90,15,4,10,15');
  });

  it('sorts weeks by week_index', () => {
    expect(toHistoryCsv([WEEK_2, WEEK_1], makePlan(), 'metric')).toBe(
      toHistoryCsv([WEEK_1, WEEK_2], makePlan(), 'metric'),
    );
  });

  it('writes three empty cells for a skipped exercise', () => {
    const lines = rows(toHistoryCsv([WEEK_1], makePlan(), 'metric'));
    expect(lines[4]).toBe('Face pull,3,12,90,3,,,');
  });

  it('adds an exercise that is not in the template at the end of its day block', () => {
    const week = weekWith(1, '2025-12-15', {
      1: [
        performed('bench_press', 'Bench press', sets(4, 10, 15)),
        performed('dips', 'Dips', sets(3, 8, null)),
      ],
    });
    const lines = rows(toHistoryCsv([week], makePlan(), 'metric'));
    expect(lines.slice(3, 6)).toEqual([
      'Bench press,4,10,90,7,4,10,7',
      'Face pull,3,12,90,3,,,',
      'Dips,,,,,3,8,',
    ]);
    expect(lines[6]).toBe(',,,,,,,');
  });

  it('leaves out rest, activity and cardio days', () => {
    const plan = makePlan();
    plan.week_template.push(
      { day_index: 4, type: 'activity', notes: null, exercises: [planned('hike', 'Hike', null)] },
      { day_index: 5, type: 'cardio', notes: null, exercises: [planned('run', 'Run', null)] },
    );
    const csv = toHistoryCsv([], plan, 'metric');
    expect(csv).not.toMatch(/Rest -|Activity|Cardio|Hike|Run/);
  });

  it('quotes a name that has a comma or a quote', () => {
    const plan = makePlan();
    plan.week_template[1]!.exercises = [planned('squat', 'Squat, "pause"', 30)];
    const lines = rows(toHistoryCsv([], plan, 'metric'));
    expect(lines[8]).toBe('"Squat, ""pause""",4,10,90,14');
  });

  it('puts a quote mark before a name that starts with a formula character', () => {
    const plan = makePlan();
    plan.week_template[1]!.exercises = [planned('squat', '=HYPERLINK("x")', 30)];
    const lines = rows(toHistoryCsv([], plan, 'metric'));
    expect(lines[8]).toBe(`"'=HYPERLINK(""x"")",4,10,90,14`);
  });

  it('starts with a BOM and uses CRLF line endings', () => {
    const csv = toHistoryCsv([WEEK_1], makePlan(), 'metric');
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/);
  });
});
