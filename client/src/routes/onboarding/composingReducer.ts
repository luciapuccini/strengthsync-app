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
  phase: 'generating' | 'ready';
};

export const initialComposingState: ComposingState = {
  header: null,
  days: [],
  phase: 'generating',
};

/**
 * The stream's own events, plus a restart. A retry re-runs the whole model
 * call and produces a different plan, so the previous attempt leaves nothing
 * behind rather than being amended.
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
      const days = [...state.days.filter((existing) => existing.index !== day.index), day];
      return { ...state, days: days.sort((a, b) => a.index - b.index) };
    }

    case 'ready':
      return { ...state, phase: 'ready' };
  }
}
