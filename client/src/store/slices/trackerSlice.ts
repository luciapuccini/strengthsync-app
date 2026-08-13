import type { StateCreator } from 'zustand';

import type { Client, ExerciseFeedback, Plan, Week, WeekDay } from '@/api/types';

import { saveDayLog } from '@/api/client';
import { toSaveDayLog } from '@/api/dayLog';
import type { TrackerData } from '@/api/weekResource';
import { invalidateCurrentWeek } from '@/api/weekResource';
import {
  setFeedback as applySetFeedback,
  toggleSet as applyToggleSet,
  toggleSkip as applyToggleSkip,
} from '@/reducers/weekReducer';
import {
  reconcileWeekDraft,
  mergeSavedDayIntoDraft,
  writeWeekDraft,
} from '@/store/weekDraftStorage';

import type { AppStore } from '../useAppStore';

function applyPersistedWeekChange(week: Week, change: (current: Week) => Week): Week {
  const nextWeek = change(week);
  writeWeekDraft(nextWeek);
  return nextWeek;
}

function patchWeek(
  set: Parameters<StateCreator<AppStore, [['zustand/devtools', never]], [], TrackerSlice>>[0],
  action: string,
  change: (week: Week) => Week,
): void {
  set(
    (state) =>
      state.week === null ? state : { week: applyPersistedWeekChange(state.week, change) },
    false,
    action,
  );
}

export type TrackerSlice = {
  client: Client | null;
  plan: Plan | null;
  week: Week | null;
  hydrateTracker: (data: TrackerData) => void;
  toggleSet: (dayIndex: number, exerciseKey: string, setIndex: number) => void;
  setFeedback: (dayIndex: number, exerciseKey: string, feedback: ExerciseFeedback | null) => void;
  toggleSkip: (dayIndex: number, exerciseKey: string) => void;
  saveDay: (day: WeekDay) => Promise<void>;
};

export const createTrackerSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never]],
  [],
  TrackerSlice
> = (set, get) => ({
  client: null,
  plan: null,
  week: null,

  hydrateTracker: (data) =>
    set(
      {
        client: data.client,
        plan: data.plan,
        week: reconcileWeekDraft(data.week, data.client?.id ?? null),
      },
      false,
      'hydrateTracker',
    ),

  toggleSet: (dayIndex, exerciseKey, setIndex) =>
    patchWeek(set, 'toggleSet', (week) => applyToggleSet(week, dayIndex, exerciseKey, setIndex)),

  setFeedback: (dayIndex, exerciseKey, feedback) =>
    patchWeek(set, 'setFeedback', (week) =>
      applySetFeedback(week, dayIndex, exerciseKey, feedback),
    ),

  toggleSkip: (dayIndex, exerciseKey) =>
    patchWeek(set, 'toggleSkip', (week) => applyToggleSkip(week, dayIndex, exerciseKey)),

  saveDay: async (day) => {
    const { client, week } = get();
    if (client === null || week === null) {
      throw new Error('Cannot save a day before the tracker is hydrated.');
    }
    const savedWeek = await saveDayLog(week.id, day.day_index, toSaveDayLog(day));
    invalidateCurrentWeek();
    set({ week: mergeSavedDayIntoDraft(savedWeek, client.id, day.day_index) }, false, 'saveDay');
  },
});
