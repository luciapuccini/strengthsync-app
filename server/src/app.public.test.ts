import { sign } from 'hono/jwt'
import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'

import { weeks } from './db/schema.ts'
import { addDays, createTestDb, todayIso } from './db/testing/index.ts'

import {
  SESSION_SECRET,
  activateGeneratedPlanViaRepository,
  createTestApp,
  signUpViaApi,
  upsertProfileViaApi,
} from './testkit.ts'

describe('health + auth', () => {
  it('GET /health is unauthenticated', async () => {
    const app = createTestApp()
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  // These four replace the tests that pinned authentication as production-only.
  // The guard now runs in every environment, so there is no NODE_ENV to set.
  it('rejects /api/* without a cookie', async () => {
    const app = createTestApp()
    expect((await app.request('/api/clients')).status).toBe(401)
  })

  it('rejects /api/* with a tampered cookie', async () => {
    const app = createTestApp()
    const client = await signUpViaApi(app)
    const tampered = `${client.headers.cookie}x`

    expect((await app.request('/api/clients', { headers: { cookie: tampered } })).status).toBe(401)
    expect((await app.request('/api/clients', { headers: { cookie: 'session=nonsense' } })).status).toBe(401)
  })

  it('rejects /api/* with an expired cookie', async () => {
    const app = createTestApp()
    const client = await signUpViaApi(app)
    const now = Math.floor(Date.now() / 1000)
    const expired = await sign({ sub: client.id, iat: now - 120, exp: now - 60 }, SESSION_SECRET, 'HS256')

    const res = await app.request('/api/clients', { headers: { cookie: `session=${expired}` } })
    expect(res.status).toBe(401)
  })

  it('leaves the way in open: sign-up, sign-in and sign-out need no cookie', async () => {
    const app = createTestApp()
    await signUpViaApi(app)

    const signIn = await app.request('/auth/sign-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'ana@example.com', password: 'dev-password-123' }),
    })
    const signOut = await app.request('/auth/sign-out', { method: 'POST' })

    expect(signIn.status).toBe(200)
    expect(signOut.status).toBe(200)
  })
})

describe('clients + profile', () => {
  it('creates and lists clients', async () => {
    const app = createTestApp()
    const client = await signUpViaApi(app)

    const list = await app.request('/api/clients', { headers: client.headers })
    expect(list.status).toBe(200)
    expect(((await list.json()) as { clients: unknown[] }).clients).toHaveLength(1)
  })

  it('returns 400 invalid_id for a malformed client uuid', async () => {
    const app = createTestApp()
    const client = await signUpViaApi(app)
    const res = await app.request('/api/clients/not-a-uuid/profile', {
      headers: client.headers,
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid_id')
  })

  it('returns 404 client_not_found for a well-formed id that matches no client', async () => {
    const app = createTestApp()
    const client = await signUpViaApi(app)
    const res = await app.request(
      '/api/clients/1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d/weeks',
      { headers: client.headers },
    )
    expect(res.status).toBe(404)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('client_not_found')
  })

  it('rejects an invalid create body with 400', async () => {
    const app = createTestApp()
    const client = await signUpViaApi(app)
    const res = await app.request('/api/clients', {
      method: 'POST',
      headers: client.jsonHeaders,
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid_input')
  })

  it('keeps a malformed JSON body inside the error envelope', async () => {
    // Hono rejects unparseable JSON before any validator runs; app.ts maps that
    // 400 back into { error: { code, message } } so the UI can read it.
    const app = createTestApp()
    const client = await signUpViaApi(app)
    const res = await app.request('/api/clients', {
      method: 'POST',
      headers: client.jsonHeaders,
      body: '{ not json',
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid_input')
  })

  it('upserts and reads the client profile', async () => {
    const app = createTestApp()
    const client = await signUpViaApi(app)
    await upsertProfileViaApi(app, client)

    const res = await app.request(`/api/clients/${client.id}/profile`, {
      headers: client.headers,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { profile: { age: number; client_id: string } }
    expect(body.profile.age).toBe(34)
    expect(body.profile.client_id).toBe(client.id)
  })
})

describe('removed endpoints', () => {
  // Cut in issues/002: no UI caller and no product need. Pinned so a future
  // route definition cannot quietly reintroduce them alongside the contract.
  it('no longer routes the three endpoints cut from the public surface', async () => {
    const db = createTestDb()
    const app = createTestApp({ db })
    const client = await signUpViaApi(app)
    const { first_week } = await activateGeneratedPlanViaRepository(db, client.id, 'wf-cut')

    for (const path of [
      `/api/clients/${client.id}`,
      `/api/clients/${client.id}/plans`,
      `/api/clients/${client.id}/weeks/${first_week.id}`,
    ]) {
      const res = await app.request(path, { headers: client.headers })
      expect(res.status, `${path} should not be routed`).toBe(404)
    }
  })
})

describe('training reads', () => {
  it('returns 404 for current week and active plan before any plan exists', async () => {
    const app = createTestApp()
    const client = await signUpViaApi(app)

    const week = await app.request(`/api/clients/${client.id}/weeks/current`, {
      headers: client.headers,
    })
    expect(week.status).toBe(404)

    const plan = await app.request(`/api/clients/${client.id}/plans/active`, {
      headers: client.headers,
    })
    expect(plan.status).toBe(404)
  })

  it('returns 404 when the in_flight week has not started yet', async () => {
    const db = createTestDb()
    const app = createTestApp({ db })
    const client = await signUpViaApi(app)
    await upsertProfileViaApi(app, client)
    const { first_week } = await activateGeneratedPlanViaRepository(db, client.id, 'wf-future-week')
    const futureStart = addDays(todayIso(), 7)
    await db
      .update(weeks)
      .set({ start_date: futureStart, end_date: addDays(futureStart, 6) })
      .where(eq(weeks.id, first_week.id))

    const res = await app.request(`/api/clients/${client.id}/weeks/current`, {
      headers: client.headers,
    })
    expect(res.status).toBe(404)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'current_week_not_found',
    )
  })

  it('rejects an invalid week status filter with 400', async () => {
    const app = createTestApp()
    const client = await signUpViaApi(app)
    const res = await app.request(`/api/clients/${client.id}/weeks?status=bogus`, {
      headers: client.headers,
    })
    expect(res.status).toBe(400)
  })

})

describe('week route parameters', () => {
  it('rejects an out-of-range or non-numeric dayIndex with 400 invalid_input', async () => {
    // dayIndex is a coerced path param, but a bad one is a bad value rather than
    // an unusable route id, so it keeps invalid_input (see #003's mapping).
    const db = createTestDb()
    const app = createTestApp({ db })
    const client = await signUpViaApi(app)
    const { first_week } = await activateGeneratedPlanViaRepository(db, client.id, 'wf-day-index')

    for (const dayIndex of ['0', '8', 'abc']) {
      const res = await app.request(
        `/api/clients/${client.id}/weeks/${first_week.id}/days/${dayIndex}/save`,
        {
          method: 'POST',
          headers: client.jsonHeaders,
          body: JSON.stringify({ exercises: [] }),
        },
      )
      expect(res.status, `dayIndex=${dayIndex}`).toBe(400)
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid_input')
    }
  })

  it('filters the week list by planId', async () => {
    const db = createTestDb()
    const app = createTestApp({ db })
    const client = await signUpViaApi(app)
    const { plan } = await activateGeneratedPlanViaRepository(db, client.id, 'wf-filter')

    const matching = await app.request(`/api/clients/${client.id}/weeks?planId=${plan.id}`, {
      headers: client.headers,
    })
    expect(((await matching.json()) as { weeks: unknown[] }).weeks.length).toBeGreaterThan(0)

    const other = await app.request(
      `/api/clients/${client.id}/weeks?planId=1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d`,
      { headers: client.headers },
    )
    expect(((await other.json()) as { weeks: unknown[] }).weeks).toHaveLength(0)
  })
})

describe('day log writes', () => {
  it('rejects a day patch whose skipped exercise carries sets (400)', async () => {
    const db = createTestDb()
    const app = createTestApp({ db })
    const client = await signUpViaApi(app)
    const { first_week } = await activateGeneratedPlanViaRepository(db, client.id, 'wf-setup')

    const res = await app.request(
      `/api/clients/${client.id}/weeks/${first_week.id}/days/1`,
      {
        method: 'PATCH',
        headers: client.jsonHeaders,
        body: JSON.stringify({
          completed: false,
          exercises: [
            {
              exercise_key: 'press_banca',
              skipped: true,
              feedback: null,
              sets: [{ performed_reps: 8, performed_weight_kg: 60 }],
            },
          ],
        }),
      },
    )
    expect(res.status).toBe(400)
  })
})

describe('workflow trigger', () => {
  const stubEnv = {
    STRENGTHSYNC_WORKFLOW: {
      create: async ({ params }: { params: { clientId: string } }) => ({
        id: `instance-for-${params.clientId}`,
        status: async () => ({ status: 'queued' }),
      }),
    },
  }

  // No cookie: /wf/* is outside the guard, as it was outside the Basic gate.
  // The requests used to carry a Basic header that nothing checked.
  const post = (body: unknown) =>
    createTestApp().request(
      '/wf/complete-week',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
      stubEnv,
    )

  it('starts a workflow instance for a valid clientId', async () => {
    const res = await post({ clientId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d' })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { instanceId: string }
    expect(body.instanceId).toBe('instance-for-1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d')
  })

  it('rejects a missing or non-uuid clientId with 400', async () => {
    // Previously a bare req.json<{clientId: string}>() cast: both of these
    // reached the workflow binding unchecked.
    for (const body of [{}, { clientId: 'not-a-uuid' }]) {
      const res = await post(body)
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid_input')
    }
  })
})

describe('day save', () => {
  it('saves a day via POST and always marks it completed', async () => {
    const db = createTestDb()
    const app = createTestApp({ db })
    const client = await signUpViaApi(app)
    const { first_week } = await activateGeneratedPlanViaRepository(db, client.id, 'wf-setup')

    const res = await app.request(
      `/api/clients/${client.id}/weeks/${first_week.id}/days/1/save`,
      {
        method: 'POST',
        headers: client.jsonHeaders,
        body: JSON.stringify({
          exercises: [
            {
              exercise_key: 'press_banca',
              skipped: false,
              feedback: 'hard',
              sets: [{ performed_reps: 8, performed_weight_kg: 60 }],
            },
          ],
        }),
      },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      week: { schedule: Array<{ day_index: number; completed: boolean; completed_at: string | null }> }
    }
    const day = body.week.schedule.find((d) => d.day_index === 1)
    expect(day?.completed).toBe(true)
    expect(day?.completed_at).not.toBeNull()
  })
})
