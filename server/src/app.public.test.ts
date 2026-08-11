import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'

import { weeks } from './db/schema.ts'
import { addDays, createTestDb, todayIso } from './db/testing/index.ts'

import {
  activateGeneratedPlanViaRepository,
  basicHeader,
  createClientViaApi,
  createTestApp,
  upsertProfileViaApi,
} from './testkit.ts'

describe('health + auth', () => {
  it('GET /health is unauthenticated', async () => {
    const app = createTestApp()
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('rejects /api/* without credentials (401) in production', async () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const app = createTestApp()
      const res = await app.request('/api/clients')
      expect(res.status).toBe(401)
    } finally {
      process.env.NODE_ENV = prev
    }
  })

  it('rejects /api/* with wrong credentials (401) in production', async () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const app = createTestApp()
      const res = await app.request('/api/clients', {
        headers: { authorization: `Basic ${btoa('coach:wrong')}` },
      })
      expect(res.status).toBe(401)
    } finally {
      process.env.NODE_ENV = prev
    }
  })

  it('allows /api/* without credentials when not production', async () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    try {
      const app = createTestApp()
      const res = await app.request('/api/clients')
      expect(res.status).not.toBe(401)
    } finally {
      process.env.NODE_ENV = prev
    }
  })

})

describe('clients + profile', () => {
  it('creates and lists clients', async () => {
    const app = createTestApp()
    await createClientViaApi(app)

    const list = await app.request('/api/clients', { headers: { authorization: basicHeader() } })
    expect(list.status).toBe(200)
    expect(((await list.json()) as { clients: unknown[] }).clients).toHaveLength(1)
  })

  it('returns 400 invalid_id for a malformed client uuid', async () => {
    const app = createTestApp()
    const res = await app.request('/api/clients/not-a-uuid/profile', {
      headers: { authorization: basicHeader() },
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid_id')
  })

  it('returns 404 client_not_found for a well-formed id that matches no client', async () => {
    const app = createTestApp()
    const res = await app.request(
      '/api/clients/1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d/weeks',
      { headers: { authorization: basicHeader() } },
    )
    expect(res.status).toBe(404)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('client_not_found')
  })

  it('rejects an invalid create body with 400', async () => {
    const app = createTestApp()
    const res = await app.request('/api/clients', {
      method: 'POST',
      headers: { authorization: basicHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid_input')
  })

  it('keeps a malformed JSON body inside the error envelope', async () => {
    // Hono rejects unparseable JSON before any validator runs; app.ts maps that
    // 400 back into { error: { code, message } } so the UI can read it.
    const app = createTestApp()
    const res = await app.request('/api/clients', {
      method: 'POST',
      headers: { authorization: basicHeader(), 'content-type': 'application/json' },
      body: '{ not json',
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid_input')
  })

  it('upserts and reads the client profile', async () => {
    const app = createTestApp()
    const client = await createClientViaApi(app)
    await upsertProfileViaApi(app, client.id)

    const res = await app.request(`/api/clients/${client.id}/profile`, {
      headers: { authorization: basicHeader() },
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
    const client = await createClientViaApi(app)
    const { first_week } = await activateGeneratedPlanViaRepository(db, client.id, 'wf-cut')

    for (const path of [
      `/api/clients/${client.id}`,
      `/api/clients/${client.id}/plans`,
      `/api/clients/${client.id}/weeks/${first_week.id}`,
    ]) {
      const res = await app.request(path, { headers: { authorization: basicHeader() } })
      expect(res.status, `${path} should not be routed`).toBe(404)
    }
  })
})

describe('training reads', () => {
  it('returns 404 for current week and active plan before any plan exists', async () => {
    const app = createTestApp()
    const client = await createClientViaApi(app)

    const week = await app.request(`/api/clients/${client.id}/weeks/current`, {
      headers: { authorization: basicHeader() },
    })
    expect(week.status).toBe(404)

    const plan = await app.request(`/api/clients/${client.id}/plans/active`, {
      headers: { authorization: basicHeader() },
    })
    expect(plan.status).toBe(404)
  })

  it('returns 404 when the in_flight week has not started yet', async () => {
    const db = createTestDb()
    const app = createTestApp({ db })
    const client = await createClientViaApi(app)
    await upsertProfileViaApi(app, client.id)
    const { first_week } = await activateGeneratedPlanViaRepository(db, client.id, 'wf-future-week')
    const futureStart = addDays(todayIso(), 7)
    await db
      .update(weeks)
      .set({ start_date: futureStart, end_date: addDays(futureStart, 6) })
      .where(eq(weeks.id, first_week.id))

    const res = await app.request(`/api/clients/${client.id}/weeks/current`, {
      headers: { authorization: basicHeader() },
    })
    expect(res.status).toBe(404)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'current_week_not_found',
    )
  })

  it('rejects an invalid week status filter with 400', async () => {
    const app = createTestApp()
    const client = await createClientViaApi(app)
    const res = await app.request(`/api/clients/${client.id}/weeks?status=bogus`, {
      headers: { authorization: basicHeader() },
    })
    expect(res.status).toBe(400)
  })

  it('rejects a day patch whose skipped exercise carries sets (400)', async () => {
    const db = createTestDb()
    const app = createTestApp({ db })
    const client = await createClientViaApi(app)
    const { first_week } = await activateGeneratedPlanViaRepository(db, client.id, 'wf-setup')

    const res = await app.request(
      `/api/clients/${client.id}/weeks/${first_week.id}/days/1`,
      {
        method: 'PATCH',
        headers: { authorization: basicHeader(), 'content-type': 'application/json' },
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

describe('day save', () => {
  it('saves a day via POST and always marks it completed', async () => {
    const db = createTestDb()
    const app = createTestApp({ db })
    const client = await createClientViaApi(app)
    const { first_week } = await activateGeneratedPlanViaRepository(db, client.id, 'wf-setup')

    const res = await app.request(
      `/api/clients/${client.id}/weeks/${first_week.id}/days/1/save`,
      {
        method: 'POST',
        headers: { authorization: basicHeader(), 'content-type': 'application/json' },
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
