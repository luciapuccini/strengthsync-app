import type { DayType, PlanStreamEvent } from '@/api/types';

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

const DAYS_IN_WEEK = 7;

export const initialComposingState: ComposingState = {
  header: null,
  days: [],
  phase: 'generating',
};

export type ComposingAction = PlanStreamEvent | { type: 'restart' };

export function composingReducer(state: ComposingState, action: ComposingAction): ComposingState {
  switch (action.type) {
    case 'restart':
      return initialComposingState;

    case 'meta':
      return { ...state, header: { label: action.label, totalWeeks: action.total_weeks } };

    case 'day': {
      const day = {
        index: action.day_index,
        type: action.day_type,
        exerciseCount: action.exercise_count,
      };
      const days = [...state.days.filter((existing) => existing.index !== day.index), day].sort(
        (a, b) => a.index - b.index,
      );

      return { ...state, days, phase: days.length >= DAYS_IN_WEEK ? 'saving' : state.phase };
    }

    case 'ready':
      return { ...state, phase: 'ready' };

    case 'failed':
      return { ...initialComposingState, phase: 'failed' };
  }
}
