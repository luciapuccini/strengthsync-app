import { WeekSchema } from '@strengthsync/domain/model'
import type { Week } from '@strengthsync/domain/model'

const WEEK_DRAFT_PREFIX = 'strengthsync:week-draft:'

function storageKey(clientId: string): string {
  return `${WEEK_DRAFT_PREFIX}${clientId}`
}

function getStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function removeWeekDraft(clientId: string): void {
  try {
    getStorage()?.removeItem(storageKey(clientId))
  } catch {
    // Storage failures must not prevent the live Zustand update.
  }
}

export function readWeekDraft(clientId: string): Week | null {
  const storage = getStorage()
  if (storage === null) return null

  try {
    const value = storage.getItem(storageKey(clientId))
    if (value === null) return null
    const parsed = WeekSchema.safeParse(JSON.parse(value))
    if (parsed.success) return parsed.data
    removeWeekDraft(clientId)
    return null
  } catch {
    removeWeekDraft(clientId)
    return null
  }
}

export function writeWeekDraft(week: Week): void {
  try {
    getStorage()?.setItem(storageKey(week.client_id), JSON.stringify(week))
  } catch {
    // The live Zustand state remains usable when storage is unavailable.
  }
}

export function reconcileWeekDraft(serverWeek: Week | null, clientId: string | null): Week | null {
  if (clientId === null) return serverWeek
  if (serverWeek === null) {
    removeWeekDraft(clientId)
    return null
  }

  const draft = readWeekDraft(clientId)
  if (draft === null) return serverWeek
  if (draft.id !== serverWeek.id) {
    removeWeekDraft(clientId)
    return serverWeek
  }
  return { ...serverWeek, schedule: draft.schedule }
}

/**
 * After a successful day PATCH, keep other days' local draft edits but trust
 * the server for the day we just saved (including derived `completed`).
 */
export function mergeSavedDayIntoDraft(
  serverWeek: Week,
  clientId: string,
  dayIndex: number,
): Week {
  const draft = readWeekDraft(clientId)
  const savedDay = serverWeek.schedule.find((day) => day.day_index === dayIndex)
  if (draft === null || draft.id !== serverWeek.id || savedDay === undefined) {
    writeWeekDraft(serverWeek)
    return serverWeek
  }
  const nextWeek = {
    ...serverWeek,
    schedule: draft.schedule.map((day) => (day.day_index === dayIndex ? savedDay : day)),
  }
  writeWeekDraft(nextWeek)
  return nextWeek
}
