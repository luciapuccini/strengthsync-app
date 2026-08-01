import { z } from 'zod'

import {
  CreateClientInputSchema,
  SaveDayLogSchema,
  StartPlanGenerationSchema,
  StartWeeklyProgressionSchema,
  UpdateClientProfileSchema,
  WorkflowStartedSchema,
  WorkflowStatusSchema,
} from '@strengthsync/domain/contracts'
import type {
  CreateClientInput,
  SaveDayLog,
  StartPlanGeneration,
  UpdateClientProfile,
  WorkflowStarted,
  WorkflowStatus,
} from '@strengthsync/domain/contracts'
import { ClientProfileSchema, ClientSchema, PlanSchema, WeekSchema } from '@strengthsync/domain/model'
import type { Client, ClientProfile, Plan, Week } from '@strengthsync/domain/model'

import { ApiClientError, toApiError } from './errors'

/**
 * Typed wrappers over the public API (`docs/architecture/api_contracts.md`).
 * Every response is re-validated with the shared domain schemas so the browser
 * and Worker agree on the contract. The browser never touches `/internal/*`.
 */

type RequestInitJson = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  body?: unknown
}

async function request(path: string, init: RequestInitJson = {}): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(path, {
      method: init.method ?? 'GET',
      headers: init.body === undefined ? {} : { 'content-type': 'application/json' },
      body: init.body === undefined ? null : JSON.stringify(init.body),
    })
  } catch {
    throw new ApiClientError('network', 0, 'network_error', 'could not reach the server')
  }
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) throw toApiError(res.status, body)
  return body
}

/** Run a read that treats a 404 as an expected "no record yet" (returns null). */
async function orNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof ApiClientError && err.kind === 'not_found') return null
    throw err
  }
}

const ClientsResponse = z.object({ clients: z.array(ClientSchema) })
const ClientResponse = z.object({ client: ClientSchema })
const ProfileResponse = z.object({ profile: ClientProfileSchema })
const PlanResponse = z.object({ plan: PlanSchema })
const WeekResponse = z.object({ week: WeekSchema })
const WeeksResponse = z.object({ weeks: z.array(WeekSchema) })

export async function getClients(): Promise<Client[]> {
  return ClientsResponse.parse(await request('/api/clients')).clients
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const body = CreateClientInputSchema.parse(input)
  return ClientResponse.parse(await request('/api/clients', { method: 'POST', body })).client
}

export async function getProfile(clientId: string): Promise<ClientProfile | null> {
  return orNull(async () =>
    ProfileResponse.parse(await request(`/api/clients/${clientId}/profile`)).profile,
  )
}

export async function updateProfile(
  clientId: string,
  input: UpdateClientProfile,
): Promise<ClientProfile> {
  const body = UpdateClientProfileSchema.parse(input)
  const res = await request(`/api/clients/${clientId}/profile`, { method: 'PUT', body })
  return ProfileResponse.parse(res).profile
}

export async function getActivePlan(clientId: string): Promise<Plan | null> {
  return orNull(async () =>
    PlanResponse.parse(await request(`/api/clients/${clientId}/plans/active`)).plan,
  )
}

export async function getPlan(clientId: string, planId: string): Promise<Plan> {
  return PlanResponse.parse(await request(`/api/clients/${clientId}/plans/${planId}`)).plan
}

export async function getCurrentWeek(clientId: string): Promise<Week | null> {
  return orNull(async () =>
    WeekResponse.parse(await request(`/api/clients/${clientId}/weeks/current`)).week,
  )
}

export async function listCompletedWeeks(clientId: string, planId: string): Promise<Week[]> {
  const path = `/api/clients/${clientId}/weeks?status=completed&planId=${encodeURIComponent(planId)}`
  return WeeksResponse.parse(await request(path)).weeks
}

export async function saveDayLog(
  clientId: string,
  weekId: string,
  dayIndex: number,
  input: SaveDayLog,
): Promise<Week> {
  const body = SaveDayLogSchema.parse(input)
  const response = await request(
    `/api/clients/${clientId}/weeks/${weekId}/days/${dayIndex}/save`,
    { method: 'POST', body },
  )
  return WeekResponse.parse(response).week
}

export async function startWeeklyProgression(
  clientId: string,
  weekId: string,
): Promise<WorkflowStarted> {
  const body = StartWeeklyProgressionSchema.parse({ week_id: weekId })
  const response = await request(`/api/clients/${clientId}/workflows/weekly-progression`, {
    method: 'POST',
    body,
  })
  return WorkflowStartedSchema.parse(response)
}

export async function startPlanGeneration(
  clientId: string,
  input: StartPlanGeneration = {},
): Promise<WorkflowStarted> {
  const body = StartPlanGenerationSchema.parse(input)
  const response = await request(`/api/clients/${clientId}/workflows/plan-generation`, {
    method: 'POST',
    body,
  })
  return WorkflowStartedSchema.parse(response)
}

export async function getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
  const response = await request(`/api/workflows/${encodeURIComponent(workflowId)}`)
  return WorkflowStatusSchema.parse(response)
}
