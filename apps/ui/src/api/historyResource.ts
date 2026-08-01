import type { Week } from '@strengthsync/domain/model'

import { listCompletedWeeks } from '@/api/client'

const historyPromises = new Map<string, Promise<Week[]>>()

function cacheKey(clientId: string, planId: string): string {
  return `${clientId}:${planId}`
}

export function completedWeeksResource(clientId: string, planId: string): Promise<Week[]> {
  const key = cacheKey(clientId, planId)
  const cached = historyPromises.get(key)
  if (cached !== undefined) return cached

  const promise = listCompletedWeeks(clientId, planId).catch((error: unknown) => {
    historyPromises.delete(key)
    throw error
  })
  historyPromises.set(key, promise)
  return promise
}

export function invalidateCompletedWeeks(clientId: string, planId: string): void {
  historyPromises.delete(cacheKey(clientId, planId))
}
