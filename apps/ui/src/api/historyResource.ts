import type { Plan, Week } from '@strengthsync/domain/model'

import { getPlan, listCompletedWeeks } from '@/api/client'

export type HistoryData = {
  weeks: Week[]
  plan: Plan
}

const historyPromises = new Map<string, Promise<HistoryData>>()

function cacheKey(clientId: string, planId: string): string {
  return `${clientId}:${planId}`
}

export function completedWeeksResource(clientId: string, planId: string): Promise<HistoryData> {
  const key = cacheKey(clientId, planId)
  const cached = historyPromises.get(key)
  if (cached !== undefined) return cached

  const promise = Promise.all([listCompletedWeeks(clientId, planId), getPlan(clientId, planId)])
    .then(([weeks, plan]) => ({ weeks, plan }))
    .catch((error: unknown) => {
      historyPromises.delete(key)
      throw error
    })
  historyPromises.set(key, promise)
  return promise
}

export function invalidateCompletedWeeks(clientId: string, planId: string): void {
  historyPromises.delete(cacheKey(clientId, planId))
}
