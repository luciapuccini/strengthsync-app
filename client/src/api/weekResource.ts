import { getActivePlan, getCurrentWeek, getSession } from '@/api/client'
import type { Client, Plan, Week } from '@/api/types'

export type TrackerData = {
  client: Client | null
  plan: Plan | null
  week: Week | null
}

/**
 * One promise, not a map keyed by athlete: the session decides whose data this
 * is, so there is only ever one athlete's tracker to cache.
 *
 * The athlete comes from the session bootstrap rather than from the store,
 * which would make this module depend on the store, or from a list of every
 * athlete, which is what it used to search and which no longer exists.
 */
let trackerPromise: Promise<TrackerData> | null = null

export function currentWeekResource(): Promise<TrackerData> {
  trackerPromise ??= Promise.all([getSession(), getActivePlan(), getCurrentWeek()])
    .then(([client, plan, week]) => ({ client, plan, week }))
    .catch((error: unknown) => {
      trackerPromise = null
      throw error
    })
  return trackerPromise
}

export function invalidateCurrentWeek(): void {
  trackerPromise = null
}
