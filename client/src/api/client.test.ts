import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Client, UpdateClientProfile } from '@/api/types'
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
  getActivePlan,
  getPlan,
  getProfile,
  getSession,
  listCompletedWeeks,
  saveDayLog,
  setUnauthorizedHandler,
  signIn,
  signOut,
  signUp,
  updateDayLog,
  updateProfile,
} from './client'
import { ApiClientError } from './errors'

const UUID = '00000000-0000-4000-8000-000000000001'
const PLAN = '00000000-0000-4000-8000-000000000002'
const NOW = '2026-05-10T00:00:00.000Z'

const sampleClient: Client = {
  id: UUID,
  coach_id: UUID,
  display_name: 'Lucia',
  status: 'active',
  created_at: NOW,
  updated_at: NOW,
}

const profileBody: UpdateClientProfile = {
  snapshot_date: '2026-07-01',
  sex: 'female',
  age: 34,
  height_cm: 165,
  goals: { primary: 'strength' },
  body_composition: { weight_kg: 62 },
  strength_loads: { press_banca: 60 },
  nutrition: null,
  swimming: null,
  schedule_preferences: null,
  notes: null,
}

const samplePlan = {
  id: PLAN,
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

function okResponse<T>(data: T) {
  return { data, error: undefined, response: { ok: true, status: 200 } as Response }
}

function errorResponse(status: number, error: unknown) {
  return { data: undefined, error, response: { ok: false, status } as Response }
}

afterEach(() => {
  vi.clearAllMocks()
  // The handler is module state, so it outlives the test that registered it.
  setUnauthorizedHandler(() => {})
})

describe('api client', () => {
  it('reads through a session-addressed path, with no athlete id', async () => {
    mockGet.mockResolvedValue(okResponse({ plan: samplePlan }))
    await expect(getActivePlan()).resolves.toEqual(samplePlan)
    expect(mockGet).toHaveBeenCalledWith('/api/me/plans/active')
  })

  it('puts the body and parses the saved profile', async () => {
    const profile = { id: UUID, client_id: UUID, age: 34 }
    mockPut.mockResolvedValue(okResponse({ profile }))
    await expect(updateProfile(profileBody)).resolves.toEqual(profile)
    expect(mockPut).toHaveBeenCalledWith('/api/me/profile', { body: profileBody })
  })

  it('maps a 401 to an unauthorized error', async () => {
    mockGet.mockResolvedValue(
      errorResponse(401, { error: { code: 'unauthorized', message: 'nope' } }),
    )
    await expect(getActivePlan()).rejects.toMatchObject({ kind: 'unauthorized', status: 401 })
  })

  it('treats a 404 profile as "no profile yet"', async () => {
    mockGet.mockResolvedValue(
      errorResponse(404, { error: { code: 'profile_not_found', message: 'none' } }),
    )
    await expect(getProfile()).resolves.toBeNull()
    expect(mockGet).toHaveBeenCalledWith('/api/me/profile')
  })

  it('surfaces a network failure as a network error', async () => {
    mockGet.mockRejectedValue(new Error('offline'))
    await expect(getActivePlan()).rejects.toBeInstanceOf(ApiClientError)
    await expect(getActivePlan()).rejects.toMatchObject({ kind: 'network' })
  })

  it('posts a save-day body and parses the returned week', async () => {
    const week = makeWeek()
    const body = { exercises: [] }
    mockPost.mockResolvedValue(okResponse({ week }))
    await expect(saveDayLog(UUID, 2, body)).resolves.toEqual(week)
    expect(mockPost).toHaveBeenCalledWith('/api/me/weeks/{weekId}/days/{dayIndex}/save', {
      params: { path: { weekId: UUID, dayIndex: 2 } },
      body,
    })
  })
})

describe('auth', () => {
  it('posts the registration body and parses the created client', async () => {
    const body = { display_name: 'Lucia', email: 'lucia@example.com', password: 'dev-password-123' }
    mockPost.mockResolvedValue(okResponse({ client: sampleClient }))
    await expect(signUp(body)).resolves.toEqual(sampleClient)
    expect(mockPost).toHaveBeenCalledWith('/auth/sign-up', { body })
  })

  it('surfaces a duplicate email as a conflict error', async () => {
    mockPost.mockResolvedValue(
      errorResponse(409, {
        error: { code: 'email_already_registered', message: 'email already registered' },
      }),
    )
    await expect(
      signUp({ display_name: 'Lucia', email: 'lucia@example.com', password: 'dev-password-123' }),
    ).rejects.toMatchObject({ kind: 'conflict', message: 'email already registered' })
  })

  it('reads the session back as the signed-in client', async () => {
    mockGet.mockResolvedValue(okResponse({ client: sampleClient }))
    await expect(getSession()).resolves.toEqual(sampleClient)
    expect(mockGet).toHaveBeenCalledWith('/auth/session')
  })

  it('throws unauthorized when no session is present', async () => {
    mockGet.mockResolvedValue(
      errorResponse(401, { error: { code: 'unauthorized', message: 'sign in required' } }),
    )
    await expect(getSession()).rejects.toMatchObject({ kind: 'unauthorized', status: 401 })
  })

  it('posts the credentials and parses the signed-in client', async () => {
    const body = { email: 'lucia@example.com', password: 'dev-password-123' }
    mockPost.mockResolvedValue(okResponse({ client: sampleClient }))
    await expect(signIn(body)).resolves.toEqual(sampleClient)
    expect(mockPost).toHaveBeenCalledWith('/auth/sign-in', { body })
  })

  it('surfaces rejected credentials as an unauthorized error', async () => {
    mockPost.mockResolvedValue(
      errorResponse(401, {
        error: { code: 'invalid_credentials', message: 'email or password is incorrect' },
      }),
    )
    await expect(signIn({ email: 'lucia@example.com', password: 'wrong' })).rejects.toMatchObject({
      kind: 'unauthorized',
      message: 'email or password is incorrect',
    })
  })

  it('posts to the sign-out route', async () => {
    mockPost.mockResolvedValue(okResponse({ ok: true }))
    await expect(signOut()).resolves.toBeUndefined()
    expect(mockPost).toHaveBeenCalledWith('/auth/sign-out', {})
  })
})

describe('unauthorized handler', () => {
  it('runs on an unauthorized response from any call, and still rejects', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mockGet.mockResolvedValue(
      errorResponse(401, { error: { code: 'unauthorized', message: 'sign in required' } }),
    )

    await expect(getActivePlan()).rejects.toBeInstanceOf(ApiClientError)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('leaves other failures alone', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mockGet.mockResolvedValue(
      errorResponse(404, { error: { code: 'not_found', message: 'no such thing' } }),
    )

    // `getPlan`, not `getActivePlan`: the latter maps a 404 to null by design,
    // so it would resolve rather than reject.
    await expect(getPlan(PLAN)).rejects.toBeInstanceOf(ApiClientError)
    expect(handler).not.toHaveBeenCalled()
  })

  it('is not reached by a network failure, which is not an auth verdict', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mockGet.mockRejectedValue(new Error('offline'))

    await expect(getPlan(PLAN)).rejects.toMatchObject({ kind: 'network' })
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('listCompletedWeeks', () => {
  it('lists completed weeks for a plan and passes the query params', async () => {
    const week = { ...makeWeek(), status: 'completed' as const }
    mockGet.mockResolvedValue(okResponse({ weeks: [week] }))
    await expect(listCompletedWeeks(PLAN)).resolves.toEqual([week])
    expect(mockGet).toHaveBeenCalledWith('/api/me/weeks', {
      params: { query: { status: 'completed', planId: PLAN } },
    })
  })
})

describe('getPlan', () => {
  it('fetches a plan by id and parses the response', async () => {
    mockGet.mockResolvedValue(okResponse({ plan: samplePlan }))
    await expect(getPlan(PLAN)).resolves.toEqual(samplePlan)
    expect(mockGet).toHaveBeenCalledWith('/api/me/plans/{planId}', {
      params: { path: { planId: PLAN } },
    })
  })
})

describe('updateDayLog', () => {
  it('patches a day and parses the returned week', async () => {
    const week = makeWeek()
    const body = { completed: true, exercises: [] }
    mockPatch.mockResolvedValue(okResponse({ week }))
    await expect(updateDayLog(UUID, 2, body)).resolves.toEqual(week)
    expect(mockPatch).toHaveBeenCalledWith('/api/me/weeks/{weekId}/days/{dayIndex}', {
      params: { path: { weekId: UUID, dayIndex: 2 } },
      body,
    })
  })
})
