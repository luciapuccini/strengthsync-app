import { describe, expect, it } from 'vitest';

import { makeWeek } from '@/test/weekFixture';

import {
  isDayComplete,
  isExerciseComplete,
  performedCount,
  remainingSets,
} from './utils/weekUtils';
import { setFeedback, toggleSet, toggleSkip } from './weekReducer';

describe('weekReducer', () => {
  it('only adds the next set and only removes the last set', () => {
    const week = makeWeek();
    const ignored = toggleSet(week, 1, 'bench_press', 1);
    expect(ignored).toEqual(week);

    const oneSet = toggleSet(week, 1, 'bench_press', 0);
    const exercise = oneSet.schedule[0]!.exercises[0]!;
    expect(exercise.sets).toEqual([{ performed_reps: 8, performed_weight_kg: 30 }]);
    expect(performedCount(exercise)).toBe(1);
    expect(remainingSets(exercise)).toBe(1);

    const undone = toggleSet(oneSet, 1, 'bench_press', 0);
    expect(undone.schedule[0]!.exercises[0]!.sets).toEqual([]);
  });

  it('marks a training day complete when every prescribed set is logged', () => {
    const first = toggleSet(makeWeek(), 1, 'bench_press', 0);
    const complete = toggleSet(first, 1, 'bench_press', 1);
    expect(isExerciseComplete(complete.schedule[0]!.exercises[0]!)).toBe(true);
    expect(isDayComplete(complete.schedule[0]!)).toBe(true);
    expect(complete.schedule[0]!.completed).toBe(true);
  });

  it('clears sets when skipping and supports feedback', () => {
    const withSet = toggleSet(makeWeek(), 1, 'bench_press', 0);
    const skipped = toggleSkip(withSet, 1, 'bench_press');
    expect(skipped.schedule[0]!.exercises[0]).toMatchObject({
      skipped: true,
      sets: [],
    });
    expect(skipped.schedule[0]!.completed).toBe(true);

    const withFeedback = setFeedback(skipped, 1, 'bench_press', 'heavy');
    expect(withFeedback.schedule[0]!.exercises[0]!.feedback).toBe('heavy');
  });
});
