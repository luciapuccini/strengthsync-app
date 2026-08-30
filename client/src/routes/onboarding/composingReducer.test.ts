import { describe, expect, it } from 'vitest';

import type { ComposingAction } from './composingReducer';
import { composingReducer, initialComposingState } from './composingReducer';

/**
 * Folds a fixed event sequence and asserts the result, in the shape of the
 * existing week and onboarding reducer tests. Nothing is mocked because
 * nothing is reached for: events in, state out.
 */
function fold(actions: ComposingAction[]) {
  return actions.reduce(composingReducer, initialComposingState);
}

const meta: ComposingAction = { type: 'meta', label: 'Upper/Lower Strength', total_weeks: 6 };

describe('composingReducer', () => {
  it('takes the header from meta and accumulates days in order', () => {
    const state = fold([
      meta,
      { type: 'day', day_index: 1, day_type: 'upper_body', exercise_count: 5 },
      { type: 'day', day_index: 2, day_type: 'rest', exercise_count: 0 },
      { type: 'day', day_index: 3, day_type: 'leg_day', exercise_count: 4 },
    ]);

    expect(state.header).toEqual({ label: 'Upper/Lower Strength', totalWeeks: 6 });
    expect(state.days).toEqual([
      { index: 1, type: 'upper_body', exerciseCount: 5 },
      { index: 2, type: 'rest', exerciseCount: 0 },
      { index: 3, type: 'leg_day', exerciseCount: 4 },
    ]);
    expect(state.phase).toBe('generating');
  });

  it('orders rows by day index whatever order they arrive in, without duplicating one', () => {
    const state = fold([
      { type: 'day', day_index: 3, day_type: 'leg_day', exercise_count: 4 },
      { type: 'day', day_index: 1, day_type: 'upper_body', exercise_count: 5 },
      { type: 'day', day_index: 1, day_type: 'upper_body', exercise_count: 5 },
    ]);

    expect(state.days.map((day) => day.index)).toEqual([1, 3]);
  });

  it('enters the ready phase once the plan is saved', () => {
    const state = fold([
      meta,
      { type: 'day', day_index: 1, day_type: 'full_body', exercise_count: 6 },
      { type: 'ready', plan_id: 'plan-1', first_week_id: 'week-1' },
    ]);

    expect(state.phase).toBe('ready');
    expect(state.days).toHaveLength(1);
  });

  it('leaves nothing behind on a restart', () => {
    const state = fold([
      meta,
      { type: 'day', day_index: 1, day_type: 'upper_body', exercise_count: 5 },
      { type: 'restart' },
    ]);

    expect(state).toEqual(initialComposingState);
  });
});
