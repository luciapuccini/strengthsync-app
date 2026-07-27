import type { StateCreator } from 'zustand'

import type { Client, ExerciseFeedback, Plan, Week, WeekDay } from '@strengthsync/domain/model'

import { saveDayLog } from '@/api/client'
import { toUpdateDayLog } from '@/api/dayLog'
import type { TrackerData } from '@/api/weekResource'
import { currentWeekResource, invalidateCurrentWeek } from '@/api/weekResource'
import {
  setFeedback as applySetFeedback,
  toggleSet as applyToggleSet,
  toggleSkip as applyToggleSkip,
} from '@/reducers/weekReducer'
import { reconcileWeekDraft, writeWeekDraft } from '@/store/weekDraftStorage'

import type { AppStore } from '../useAppStore'

function applyPersistedWeekChange(week: Week, change: (current: Week) => Week): Week {
  const nextWeek = change(week)
  writeWeekDraft(nextWeek)
  return nextWeek
}

export type TrackerSlice = {
  client: Client | null
  plan: Plan | null
  week: Week | null
  hydrateTracker: (data: TrackerData) => void
  toggleSet: (dayIndex: number, exerciseKey: string, setIndex: number) => void
  setFeedback: (
    dayIndex: number,
    exerciseKey: string,
    feedback: ExerciseFeedback | null,
  ) => void
  toggleSkip: (dayIndex: number, exerciseKey: string) => void
  saveDay: (day: WeekDay) => Promise<void>
  refreshTracker: () => Promise<void>
}

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
    set(
      (state) =>
        state.week === null
          ? state
          : {
              week: applyPersistedWeekChange(state.week, (week) =>
                applyToggleSet(week, dayIndex, exerciseKey, setIndex),
              ),
            },
      false,
      'toggleSet',
    ),

  setFeedback: (dayIndex, exerciseKey, feedback) =>
    set(
      (state) =>
        state.week === null
          ? state
          : { week: applySetFeedback(state.week, dayIndex, exerciseKey, feedback) },
      false,
      'setFeedback',
    ),

  toggleSkip: (dayIndex, exerciseKey) =>
    set(
      (state) =>
        state.week === null
          ? state
          : {
              week: applyPersistedWeekChange(state.week, (week) =>
                applyToggleSkip(week, dayIndex, exerciseKey),
              ),
            },
      false,
      'toggleSkip',
    ),

  saveDay: async (day) => {
    const { client, week } = get()
    if (client === null || week === null) {
      throw new Error('Cannot save a day before the tracker is hydrated.')
    }
    const savedWeek = await saveDayLog(client.id, week.id, day.day_index, toUpdateDayLog(day))
    invalidateCurrentWeek(client.id)
    set({ week: reconcileWeekDraft(savedWeek, client.id) }, false, 'saveDay')
  },

  refreshTracker: async () => {
    const { client } = get()
    if (client === null) return
    invalidateCurrentWeek(client.id)
    const data = await currentWeekResource(client.id)
    set(
      {
        client: data.client,
        plan: data.plan,
        week: reconcileWeekDraft(data.week, client.id),
      },
      false,
      'refreshTracker',
    )
  },
})
