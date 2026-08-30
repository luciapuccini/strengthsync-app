import type { DayType } from '../../domain/model/index.ts';

import type { PlanStreamEvent } from './schemas.ts';

/**
 * The one piece of genuinely fallible reasoning in first-plan streaming:
 * deciding which of the events the athlete is owed have become true, given a
 * plan object that is still being written.
 *
 * Pure on purpose. It reads a plain object and returns plain events plus the
 * state to hand back on the next call, so the whole emit-once rule can be
 * exercised with hand-built partials — no model, no network, no server. The
 * handler that uses it does no deciding of its own.
 */

/**
 * What has already been written to the stream. Opaque to the caller: it comes
 * out of `settleEvents` and goes straight back in.
 */
export type SettleState = {
  readonly announced: boolean;
  readonly emittedDays: number;
};

export const NOTHING_SETTLED: SettleState = { announced: false, emittedDays: 0 };

type PartialDay = {
  type?: DayType | undefined;
  exercises?: readonly unknown[] | undefined;
};

/**
 * As much of the generated plan as the model has written so far. Declared
 * structurally rather than imported from the AI SDK's partial type, so this
 * module knows nothing about how a partial arrives and a hand-built object in
 * a test is the same input as a real parse.
 */
export type PartialPlan = {
  label?: string | undefined;
  total_weeks?: number | undefined;
  week_template?: readonly (PartialDay | undefined)[] | undefined;
};

export type SettleResult = {
  events: PlanStreamEvent[];
  state: SettleState;
};

/** `meta`, the first time both of its fields have parsed and never again. */
function announce(state: SettleState, partial: PartialPlan): PlanStreamEvent | null {
  if (state.announced) return null;
  const { label, total_weeks } = partial;
  if (label === undefined || total_weeks === undefined) return null;
  return { type: 'meta', label, total_weeks };
}

/**
 * One `day` for every day that has settled since the last call, in day order.
 *
 * A day settles when the next one appears, because until then the model may
 * still be adding exercises to it and the count would be a lie. At stream end
 * the last day settles too: nothing more is coming.
 *
 * The index is the day's position in the array rather than the `day_index` the
 * model wrote, so the rows the athlete sees are 1..7 in order whatever the
 * model numbered them.
 */
function settleDays(
  state: SettleState,
  days: readonly (PartialDay | undefined)[],
  streamEnded: boolean,
): PlanStreamEvent[] {
  const settled = streamEnded ? days.length : days.length - 1;
  const events: PlanStreamEvent[] = [];
  for (let index = state.emittedDays; index < settled; index += 1) {
    const day = days[index];
    // A settled day with no type cannot be described. Stop rather than skip,
    // so rows stay contiguous and a later call can still pick this one up.
    if (day?.type === undefined) break;
    events.push({
      type: 'day',
      day_index: index + 1,
      day_type: day.type,
      exercise_count: day.exercises?.length ?? 0,
    });
  }
  return events;
}

/**
 * The events owed for this partial, and the state to pass to the next call.
 * Never emits `ready` — that one is only true once the plan is in the
 * database, which this module has no way of knowing.
 */
export function settleEvents(
  state: SettleState,
  partial: PartialPlan,
  { streamEnded }: { streamEnded: boolean },
): SettleResult {
  const meta = announce(state, partial);
  const days = settleDays(state, partial.week_template ?? [], streamEnded);
  return {
    events: meta === null ? days : [meta, ...days],
    state: {
      announced: state.announced || meta !== null,
      emittedDays: state.emittedDays + days.length,
    },
  };
}
