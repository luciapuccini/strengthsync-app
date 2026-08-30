import type { DayType, PlanStreamEvent } from '@/api/types';

/**
 * What the athlete is shown while the coach writes their first plan, folded
 * out of the generation stream's events.
 *
 * Local to this route, like `onboardingReducer`, and pure for the same reason
 * the day-settling module on the server is: a fixed sequence of events folded
 * into a state is the whole of what this has to get right, and that is
 * testable without a stream.
 *
 * Nothing here is authoritative. These events describe an unvalidated,
 * unpersisted candidate; the plan the athlete trains from is the one the
 * tracker reads back out of the database once `ready` has landed.
 */

export type ComposingDay = {
  index: number;
  type: DayType;
  exerciseCount: number;
};

export type ComposingState = {
  header: { label: string; totalWeeks: number } | null;
  days: ComposingDay[];
  phase: 'generating' | 'saving' | 'ready' | 'failed';
};

/**
 * A plan's week template is the seven days the first-plan prompt requires, so
 * the seventh row is the last one coming and everything after it is the write
 * and the read back. If a shorter week ever arrived the screen would keep
 * saying it is building rather than saving — late, not blank.
 */
const DAYS_IN_WEEK = 7;

export const initialComposingState: ComposingState = {
  header: null,
  days: [],
  phase: 'generating',
};

/**
 * The stream's own events, plus a restart. A retry re-runs the whole model
 * call and produces a different plan, so the previous attempt leaves nothing
 * behind rather than being amended — which is also what `failed` does, for
 * the same reason.
 */
export type ComposingAction = PlanStreamEvent | { type: 'restart' };

export function composingReducer(state: ComposingState, action: ComposingAction): ComposingState {
  switch (action.type) {
    case 'restart':
      return initialComposingState;

    case 'meta':
      return { ...state, header: { label: action.label, totalWeeks: action.total_weeks } };

    case 'day': {
      // Keyed by day index rather than appended, so a repeated event cannot
      // duplicate a row and the order the athlete reads does not depend on the
      // order the frames arrived in.
      const day = {
        index: action.day_index,
        type: action.day_type,
        exerciseCount: action.exercise_count,
      };
      const days = [...state.days.filter((existing) => existing.index !== day.index), day].sort(
        (a, b) => a.index - b.index,
      );
      // The phase turns over here rather than in the view: after the last row
      // there is a real pause while the plan is written and read back, and the
      // screen has to say which of the two it is doing.
      return { ...state, days, phase: days.length >= DAYS_IN_WEEK ? 'saving' : state.phase };
    }

    case 'ready':
      return { ...state, phase: 'ready' };

    // Cleared, not dimmed and not preserved. Those rows described a candidate
    // that was never saved, and a retry re-runs the whole call and produces a
    // different plan — keeping them would assert progress that does not exist.
    case 'failed':
      return { ...initialComposingState, phase: 'failed' };
  }
}
