import { z } from 'zod'

import { WeekSchema } from '@strengthsync/domain/model'
import type { Week } from '@strengthsync/domain/model'

const TrackingDraftSchema = z.object({
  week_id: z.string(),
  week: WeekSchema,
})

export function trackingStorageKey(weekId: string): string {
  return `strengthsync.tracking.${weekId}`
}

export function parseTrackingDraft(raw: string | null, serverWeek: Week): Week | null {
  if (raw === null) return null
  try {
    const draft = TrackingDraftSchema.parse(JSON.parse(raw))
    if (draft.week_id !== serverWeek.id || draft.week.id !== serverWeek.id) return null
    if (draft.week.updated_at !== serverWeek.updated_at) return null
    return draft.week
  } catch {
    return null
  }
}

export function serializeTrackingDraft(week: Week): string {
  return JSON.stringify({ week_id: week.id, week })
}

export function loadTrackingDraft(
  serverWeek: Week,
  storage: Pick<Storage, 'getItem'> = localStorage,
): Week | null {
  try {
    return parseTrackingDraft(storage.getItem(trackingStorageKey(serverWeek.id)), serverWeek)
  } catch {
    return null
  }
}

export function saveTrackingDraft(
  week: Week,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  try {
    storage.setItem(trackingStorageKey(week.id), serializeTrackingDraft(week))
  } catch {
    // Draft persistence is optional; in-memory tracking remains available.
  }
}

export function removeTrackingDraft(
  weekId: string,
  storage: Pick<Storage, 'removeItem'> = localStorage,
): void {
  try {
    storage.removeItem(trackingStorageKey(weekId))
  } catch {
    // Ignore unavailable storage.
  }
}
