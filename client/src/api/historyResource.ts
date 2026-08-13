import { getPlan, listCompletedWeeks } from '@/api/client'
import type { Plan, Week } from '@/api/types'

export type HistoryData = {
  weeks: Week[]
  plan: Plan
}

/**
 * Keyed by plan alone: the session decides whose plans these are, so the
 * athlete half of the old composite key carried no information.
 */
const historyPromises = new Map<string, Promise<HistoryData>>()

export function completedWeeksResource(planId: string): Promise<HistoryData> {
  const cached = historyPromises.get(planId)
  if (cached !== undefined) return cached

  const promise = Promise.all([listCompletedWeeks(planId), getPlan(planId)])
    .then(([weeks, plan]) => ({ weeks, plan }))
    .catch((error: unknown) => {
      historyPromises.delete(planId)
      throw error
    })
  historyPromises.set(planId, promise)
  return promise
}

export function invalidateCompletedWeeks(planId: string): void {
  historyPromises.delete(planId)
}
