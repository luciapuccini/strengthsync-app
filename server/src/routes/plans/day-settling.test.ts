import { describe, expect, it } from 'vitest';

import type { DayType } from '../../domain/model/index.ts';

import {
  NOTHING_SETTLED,
  settleEvents,
  type PartialPlan,
  type SettleResult,
  type SettleState,
} from './day-settling.ts';

/**
 * Colocated with the module, in the shape of `routes/weeks/schemas.test.ts`:
 * the one genuinely fallible piece of the streaming change, exercised through
 * its public interface with hand-built partials. Nothing here needs a model, a
 * network or a server, which is the whole reason the logic lives in a module
 * rather than inside the route's stream callback.
 */

const day = (type: DayType, exercises: number) => ({
  type,
  exercises: Array.from({ length: exercises }, (_, i) => ({ exercise_key: `e${String(i)}` })),
});

/** Drive a parse sequence the way the handler does and collect everything written. */
function replay(partials: PartialPlan[]): SettleResult {
  let state: SettleState = NOTHING_SETTLED;
  const events: SettleResult['events'] = [];
  let latest: PartialPlan = {};
  for (const partial of partials) {
    latest = partial;
    const step = settleEvents(state, partial, { streamEnded: false });
    state = step.state;
    events.push(...step.events);
  }
  const final = settleEvents(state, latest, { streamEnded: true });
  return { events: [...events, ...final.events], state: final.state };
}

describe('settleEvents', () => {
  it('emits meta once, and only once both of its fields have parsed', () => {
    const first = settleEvents(NOTHING_SETTLED, { label: 'Upper/Lower' }, { streamEnded: false });
    expect(first.events).toEqual([]);

    const second = settleEvents(
      first.state,
      { label: 'Upper/Lower Strength', total_weeks: 6 },
      { streamEnded: false },
    );
    expect(second.events).toEqual([
      { type: 'meta', label: 'Upper/Lower Strength', total_weeks: 6 },
    ]);

    const third = settleEvents(
      second.state,
      { label: 'Upper/Lower Strength', total_weeks: 6 },
      { streamEnded: false },
    );
    expect(third.events).toEqual([]);
  });

  it('withholds a day while it is still the last one present', () => {
    const partial = { label: 'Block', total_weeks: 4, week_template: [day('upper_body', 2)] };
    const settled = settleEvents(NOTHING_SETTLED, partial, { streamEnded: false });

    expect(settled.events).toEqual([{ type: 'meta', label: 'Block', total_weeks: 4 }]);
    expect(settled.state.emittedDays).toBe(0);
  });

  it('emits a day once the next one appears, with its type and exercise count', () => {
    const withOne = settleEvents(
      NOTHING_SETTLED,
      { week_template: [day('upper_body', 5)] },
      { streamEnded: false },
    );
    const withTwo = settleEvents(
      withOne.state,
      { week_template: [day('upper_body', 5), day('rest', 0)] },
      { streamEnded: false },
    );

    expect(withTwo.events).toEqual([
      { type: 'day', day_index: 1, day_type: 'upper_body', exercise_count: 5 },
    ]);
  });

  it('emits each day exactly once across a realistic parse sequence', () => {
    const week = [
      day('upper_body', 5),
      day('rest', 0),
      day('leg_day', 4),
      day('cardio', 0),
      day('full_body', 6),
      day('rest', 0),
      day('activity', 0),
    ];
    // Every day arrives empty, fills up, then the next one starts — the shape a
    // real structured-output parse produces.
    const partials: PartialPlan[] = [{ label: 'Block' }, { label: 'Block', total_weeks: 6 }];
    for (let n = 1; n <= week.length; n += 1) {
      partials.push({ label: 'Block', total_weeks: 6, week_template: week.slice(0, n - 1) });
      partials.push({ label: 'Block', total_weeks: 6, week_template: week.slice(0, n) });
    }

    const { events } = replay(partials);

    expect(events.filter((event) => event.type === 'meta')).toHaveLength(1);
    expect(events.filter((event) => event.type === 'day')).toEqual([
      { type: 'day', day_index: 1, day_type: 'upper_body', exercise_count: 5 },
      { type: 'day', day_index: 2, day_type: 'rest', exercise_count: 0 },
      { type: 'day', day_index: 3, day_type: 'leg_day', exercise_count: 4 },
      { type: 'day', day_index: 4, day_type: 'cardio', exercise_count: 0 },
      { type: 'day', day_index: 5, day_type: 'full_body', exercise_count: 6 },
      { type: 'day', day_index: 6, day_type: 'rest', exercise_count: 0 },
      { type: 'day', day_index: 7, day_type: 'activity', exercise_count: 0 },
    ]);
  });

  it('emits the final day at stream end and never emits ready', () => {
    const { events } = replay([
      { label: 'Block', total_weeks: 5, week_template: [day('upper_body', 3)] },
    ]);

    expect(events).toEqual([
      { type: 'meta', label: 'Block', total_weeks: 5 },
      { type: 'day', day_index: 1, day_type: 'upper_body', exercise_count: 3 },
    ]);
  });

  it('emits nothing that claims a plan for a partial that never completes', () => {
    const { events } = replay([{}, { week_template: [] }]);

    expect(events).toEqual([]);
  });
});
