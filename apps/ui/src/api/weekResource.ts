import type { Client, Plan, Week } from '@strengthsync/domain/model'

import { getActivePlan, getClients, getCurrentWeek } from '@/api/client'

export type TrackerData = {
  client: Client | null
  plan: Plan | null
  week: Week | null
}

const trackerPromises = new Map<string, Promise<TrackerData>>()
let clientsPromise: Promise<Client[]> | null = null

export function currentWeekResource(clientId: string): Promise<TrackerData> {
  const cached = trackerPromises.get(clientId)
  if (cached !== undefined) return cached

  const promise = Promise.all([getClients(), getActivePlan(clientId), getCurrentWeek(clientId)])
    .then(([clients, plan, week]) => ({
      client: clients.find((candidate) => candidate.id === clientId) ?? null,
      plan,
      week,
    }))
    .catch((error: unknown) => {
      trackerPromises.delete(clientId)
      throw error
    })
  trackerPromises.set(clientId, promise)
  return promise
}

export function invalidateCurrentWeek(clientId: string): void {
  trackerPromises.delete(clientId)
}

export function clientsResource(): Promise<Client[]> {
  clientsPromise ??= getClients().catch((error: unknown) => {
    clientsPromise = null
    throw error
  })
  return clientsPromise
}
