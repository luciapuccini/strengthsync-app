import { describe, expect, it } from 'vitest';

import { progressionCeiling } from './progression.ts';
import type { ExerciseFeedback, Week } from '../model/index.ts';

function week(week_index: number, weight_lb: number, feedback: ExerciseFeedback | null): Week {
  return {
    id: `00000000-0000-4000-8000-00000000000${week_index}`,
    client_id: '00000000-0000-4000-8000-0000000000c1',
    plan_id: '00000000-0000-4000-8000-0000000000p1',
    week_index,
    start_date: '2026-01-05',
    end_date: '2026-01-11',
    status: 'completed',
    schedule: [
      {
        day_index: 1,
        date: '2026-01-05',
        type: 'upper_body',
        notes: null,
        completed: true,
        completed_at: '2026-01-05T10:00:00.000Z',
        exercises: [
          {
            exercise_key: 'press_banca',
            name: 'Bench press',
            skipped: false,
            feedback,
            prescribed: { series: 4, reps: 8, rest_time_sec: 120, weight_lb, notes: null },
            sets: [],
          },
        ],
      },
    ],
    created_at: '2026-01-05T10:00:00.000Z',
    updated_at: '2026-01-11T10:00:00.000Z',
  } as Week;
}

const easyWeeks = [
  week(1, 135, 'easy'),
  week(2, 135, 'light'),
  week(3, 135, 'easy'),
  week(4, 135, 'easy'),
];

describe('progressionCeiling', () => {
  it('holds weeks 1 and 2 of a plan', () => {
    expect(progressionCeiling(1, []).default_mode).toBe('hold');
    expect(progressionCeiling(2, [week(1, 135, 'easy')]).default_mode).toBe('hold');
  });

  it('allows reps only from week 3', () => {
    const ceiling = progressionCeiling(3, [week(1, 135, 'easy'), week(2, 135, 'easy')]);
    expect(ceiling.by_exercise.press_banca).toBe('reps');
  });

  it('keeps week 5 on reps without four consecutive easy weeks', () => {
    const weeks = [...easyWeeks.slice(0, 3), week(4, 135, 'hard')];
    expect(progressionCeiling(5, weeks).by_exercise.press_banca).toBe('reps');
  });

  it('allows weight at week 5 after more than three consecutive easy weeks', () => {
    expect(progressionCeiling(5, easyWeeks).by_exercise.press_banca).toBe('weight');
  });

  it('restarts the cycle after a weight push', () => {
    const pushed = [...easyWeeks, week(5, 140, 'easy'), week(6, 140, 'easy')];
    expect(progressionCeiling(6, pushed.slice(0, 5)).by_exercise.press_banca).toBe('hold');
    expect(progressionCeiling(7, pushed).by_exercise.press_banca).toBe('hold');

    const settled = [...pushed, week(7, 140, 'easy'), week(8, 140, 'easy')];
    expect(progressionCeiling(8, settled.slice(0, 6)).by_exercise.press_banca).toBe('reps');
    expect(progressionCeiling(9, settled).by_exercise.press_banca).toBe('reps');
    expect(progressionCeiling(10, [...settled, week(9, 140, 'easy')]).by_exercise.press_banca).toBe(
      'weight',
    );
  });
});
