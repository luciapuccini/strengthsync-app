import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Client } from '@/api/types'
import { makeWeek } from '@/test/weekFixture'

const { mockGet, mockPost, mockPut, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockPatch: vi.fn(),
}))

vi.mock('openapi-fetch', () => ({
  default: () => ({
    GET: mockGet,
    POST: mockPost,
    PUT: mockPut,
    PATCH: mockPatch,
  }),
}))

import {
  createClient,
  getClients,
  getPlan,
  getProfile,
  listCompletedWeeks,
  saveDayLog,
  updateDayLog,
} from './client'
import { ApiClientError } from './errors'

const UUID = '00000000-0000-4000-8000-000000000001'
const NOW = '2026-05-10T00:00:00.000Z'

const sampleClient: Client = {
  id: UUID,
  coach_id: UUID,
  display_name: 'Lucia',
  status: 'active',
  created_at: NOW,
  updated_at: NOW,
}

function okResponse<T>(data: T) {
  return { data, error: undefined, response: { ok: true, status: 200 } as Response }
}

function errorResponse(status: number, error: unknown) {
  return { data: undefined, error, response: { ok: false, status } as Response }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('api client', () => {
  it('parses a successful list response', async () => {
    mockGet.mockResolvedValue(okResponse({ clients: [sampleClient] }))
    await expect(getClients()).resolves.toEqual([sampleClient])
  })

  it('posts the body and parses the created client', async () => {
    mockPost.mockResolvedValue(okResponse({ client: sampleClient }))
    await createClient({ display_name: 'Lucia' })
    expect(mockPost).toHaveBeenCalledWith('/api/clients', {
      body: { display_name: 'Lucia' },
    })
  })

  it('maps a 401 to an unauthorized error', async () => {
    mockGet.mockResolvedValue(
      errorResponse(401, { error: { code: 'unauthorized', message: 'nope' } }),
    )
    await expect(getClients()).rejects.toMatchObject({ kind: 'unauthorized', status: 401 })
  })

  it('treats a 404 profile as "no profile yet"', async () => {
    mockGet.mockResolvedValue(
      errorResponse(404, { error: { code: 'profile_not_found', message: 'none' } }),
    )
    await expect(getProfile(UUID)).resolves.toBeNull()
  })

  it('surfaces a network failure as a network error', async () => {
    mockGet.mockRejectedValue(new Error('offline'))
    await expect(getClients()).rejects.toBeInstanceOf(ApiClientError)
    await expect(getClients()).rejects.toMatchObject({ kind: 'network' })
  })

  it('posts a save-day body and parses the returned week', async () => {
    const week = makeWeek()
    const body = { exercises: [] }
    mockPost.mockResolvedValue(okResponse({ week }))
    await expect(saveDayLog(UUID, UUID, 2, body)).resolves.toEqual(week)
    expect(mockPost).toHaveBeenCalledWith(
      '/api/clients/{clientId}/weeks/{weekId}/days/{dayIndex}/save',
      {
        params: { path: { clientId: UUID, weekId: UUID, dayIndex: 2 } },
        body,
      },
    )
  })
})

describe('listCompletedWeeks', () => {
  it('lists completed weeks for a plan and passes the query params', async () => {
    const week = { ...makeWeek(), status: 'completed' as const }
    const planId = '00000000-0000-4000-8000-000000000002'
    mockGet.mockResolvedValue(okResponse({ weeks: [week] }))
    await expect(listCompletedWeeks(UUID, planId)).resolves.toEqual([week])
    expect(mockGet).toHaveBeenCalledWith('/api/clients/{clientId}/weeks', {
      params: {
        path: { clientId: UUID },
        query: { status: 'completed', planId },
      },
    })
  })
})

describe('getPlan', () => {
  it('fetches a plan by id and parses the response', async () => {
    const planId = '00000000-0000-4000-8000-000000000002'
    const plan = {
      id: planId,
      client_id: UUID,
      label: 'Block A',
      status: 'active' as const,
      total_weeks: 6,
      week_template: [],
      rationale: null,
      activated_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    }
    mockGet.mockResolvedValue(okResponse({ plan }))
    await expect(getPlan(UUID, planId)).resolves.toEqual(plan)
    expect(mockGet).toHaveBeenCalledWith('/api/clients/{clientId}/plans/{planId}', {
      params: { path: { clientId: UUID, planId } },
    })
  })
})

describe('updateDayLog', () => {
  it('patches a day and parses the returned week', async () => {
    const week = makeWeek()
    const body = { completed: true, exercises: [] }
    mockPatch.mockResolvedValue(okResponse({ week }))
    await expect(updateDayLog(UUID, UUID, 2, body)).resolves.toEqual(week)
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/clients/{clientId}/weeks/{weekId}/days/{dayIndex}',
      {
        params: { path: { clientId: UUID, weekId: UUID, dayIndex: 2 } },
        body,
      },
    )
  })
})
