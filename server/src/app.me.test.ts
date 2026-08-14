import type { OpenAPIHono } from '@hono/zod-openapi';
import { describe, expect, it } from 'vitest';

import type { Db } from './db/index.ts';
import { createTestDb } from './db/testing/index.ts';

import {
  activateGeneratedPlanViaRepository,
  createTestApp,
  signUpViaApi,
  upsertProfileViaApi,
  type TestClient,
} from './testkit.ts';

/**
 * The session-addressed API — since `issues/auth/013`, the only API. No path
 * carries an athlete id, so the athlete comes from the verified cookie and no
 * request can name anyone else, which is what the second athlete in most of
 * these tests exists to demonstrate.
 */

type Scene = { db: Db; app: OpenAPIHono; ana: TestClient; bea: TestClient };

/** Two registered athletes on one app, so "mine" can be told from "theirs". */
async function twoClients(): Promise<Scene> {
  const db = createTestDb();
  const app = createTestApp({ db });
  return { db, app, ana: await signUpViaApi(app, 'Ana'), bea: await signUpViaApi(app, 'Bea') };
}

async function body<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe('GET /api/me/profile', () => {
  it('returns 404 before a profile exists', async () => {
    const { app, ana } = await twoClients();
    const res = await app.request('/api/me/profile', { headers: ana.headers });

    expect(res.status).toBe(404);
    expect((await body<{ error: { code: string } }>(res)).error.code).toBe('profile_not_found');
  });

  it("returns the caller's own profile, never the other athlete's", async () => {
    const { app, ana, bea } = await twoClients();
    await upsertProfileViaApi(app, ana);

    const mine = await app.request('/api/me/profile', { headers: ana.headers });
    const theirs = await app.request('/api/me/profile', { headers: bea.headers });

    expect(mine.status).toBe(200);
    expect((await body<{ profile: { client_id: string } }>(mine)).profile.client_id).toBe(ana.id);
    expect(theirs.status).toBe(404);
  });
});

describe('PUT /api/me/profile', () => {
  it('creates the profile against the session, with no id in the request', async () => {
    const { app, ana } = await twoClients();
    await upsertProfileViaApi(app, ana);

    const res = await app.request('/api/me/profile', { headers: ana.headers });
    const profile = (await body<{ profile: { age: number; client_id: string } }>(res)).profile;
    expect(profile.client_id).toBe(ana.id);
    expect(profile.age).toBe(34);
  });

  it('rejects an invalid body with 400', async () => {
    const { app, ana } = await twoClients();
    const res = await app.request('/api/me/profile', {
      method: 'PUT',
      headers: ana.jsonHeaders,
      body: JSON.stringify({ age: 'thirty' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/me/onboarding', () => {
  it('creates the profile against the session, with no id in the request', async () => {
    const { app, ana } = await twoClients();

    const res = await app.request('/api/me/onboarding', {
      method: 'POST',
      headers: ana.jsonHeaders,
      body: JSON.stringify({
        sex: 'female',
        age: 29,
        height_cm: 170,
        weight_kg: 64,
        goal: 'build_muscle',
        days_per_week: 4,
      }),
    });

    expect(res.status).toBe(200);
    const profile = (await body<{ profile: { client_id: string; age: number } }>(res)).profile;
    expect(profile.client_id).toBe(ana.id);
    expect(profile.age).toBe(29);
  });

  it('rejects an invalid body with 400', async () => {
    const { app, ana } = await twoClients();

    const res = await app.request('/api/me/onboarding', {
      method: 'POST',
      headers: ana.jsonHeaders,
      body: JSON.stringify({ age: 'thirty' }),
    });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/me/plans/active', () => {
  it('returns 404 before a plan is activated', async () => {
    const { app, ana } = await twoClients();
    const res = await app.request('/api/me/plans/active', { headers: ana.headers });

    expect(res.status).toBe(404);
    expect((await body<{ error: { code: string } }>(res)).error.code).toBe('active_plan_not_found');
  });

  it("returns the caller's active plan", async () => {
    const { db, app, ana, bea } = await twoClients();
    const { plan } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-me-active');

    const mine = await app.request('/api/me/plans/active', { headers: ana.headers });
    const theirs = await app.request('/api/me/plans/active', { headers: bea.headers });

    expect((await body<{ plan: { id: string } }>(mine)).plan.id).toBe(plan.id);
    expect(theirs.status).toBe(404);
  });
});

describe('GET /api/me/plans/{planId}', () => {
  it("returns the caller's plan by id", async () => {
    const { db, app, ana } = await twoClients();
    const { plan } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-me-by-id');

    const res = await app.request(`/api/me/plans/${plan.id}`, { headers: ana.headers });
    expect((await body<{ plan: { id: string } }>(res)).plan.id).toBe(plan.id);
  });

  // The path carries a plan id, which is the one identifier a caller can still
  // choose. Naming someone else's plan finds nothing rather than reading it.
  it("returns 404 for another athlete's plan id", async () => {
    const { db, app, ana, bea } = await twoClients();
    const { plan } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-me-not-yours');

    const res = await app.request(`/api/me/plans/${plan.id}`, { headers: bea.headers });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/me/weeks/current', () => {
  it('returns 404 before a plan exists', async () => {
    const { app, ana } = await twoClients();
    const res = await app.request('/api/me/weeks/current', { headers: ana.headers });

    expect(res.status).toBe(404);
    expect((await body<{ error: { code: string } }>(res)).error.code).toBe(
      'current_week_not_found',
    );
  });

  it("returns the caller's in-flight week", async () => {
    const { db, app, ana, bea } = await twoClients();
    const { first_week } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-me-current');

    const mine = await app.request('/api/me/weeks/current', { headers: ana.headers });
    const theirs = await app.request('/api/me/weeks/current', { headers: bea.headers });

    expect((await body<{ week: { id: string } }>(mine)).week.id).toBe(first_week.id);
    expect(theirs.status).toBe(404);
  });
});

describe('GET /api/me/weeks', () => {
  it("lists only the caller's weeks", async () => {
    const { db, app, ana, bea } = await twoClients();
    await activateGeneratedPlanViaRepository(db, ana.id, 'wf-me-list');

    const mine = await app.request('/api/me/weeks', { headers: ana.headers });
    const theirs = await app.request('/api/me/weeks', { headers: bea.headers });

    expect((await body<{ weeks: unknown[] }>(mine)).weeks.length).toBeGreaterThan(0);
    expect((await body<{ weeks: unknown[] }>(theirs)).weeks).toHaveLength(0);
  });

  it('filters by planId and rejects an invalid status with 400', async () => {
    const { db, app, ana } = await twoClients();
    const { plan } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-me-filter');

    const matching = await app.request(`/api/me/weeks?planId=${plan.id}`, { headers: ana.headers });
    expect((await body<{ weeks: unknown[] }>(matching)).weeks.length).toBeGreaterThan(0);

    const other = await app.request('/api/me/weeks?planId=1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d', {
      headers: ana.headers,
    });
    expect((await body<{ weeks: unknown[] }>(other)).weeks).toHaveLength(0);

    const bogus = await app.request('/api/me/weeks?status=bogus', { headers: ana.headers });
    expect(bogus.status).toBe(400);
  });
});

describe('day log writes under /api/me', () => {
  it('saves a day and marks it completed', async () => {
    const { db, app, ana } = await twoClients();
    const { first_week } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-me-save');

    const res = await app.request(`/api/me/weeks/${first_week.id}/days/1/save`, {
      method: 'POST',
      headers: ana.jsonHeaders,
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
    });

    expect(res.status).toBe(200);
    const week = (
      await body<{
        week: {
          schedule: Array<{ day_index: number; completed: boolean; completed_at: string | null }>;
        };
      }>(res)
    ).week;
    const day = week.schedule.find((d) => d.day_index === 1);
    expect(day?.completed).toBe(true);
    expect(day?.completed_at).not.toBeNull();
  });

  it('patches a day', async () => {
    const { db, app, ana } = await twoClients();
    const { first_week } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-me-patch');

    const res = await app.request(`/api/me/weeks/${first_week.id}/days/1`, {
      method: 'PATCH',
      headers: ana.jsonHeaders,
      body: JSON.stringify({
        completed: true,
        exercises: [{ exercise_key: 'press_banca', skipped: true, feedback: null, sets: [] }],
      }),
    });

    expect(res.status).toBe(200);
    const week = (
      await body<{ week: { schedule: Array<{ day_index: number; completed: boolean }> } }>(res)
    ).week;
    expect(week.schedule.find((d) => d.day_index === 1)?.completed).toBe(true);
  });

  // The week id is the caller's other free choice: it belongs to Ana, and Bea
  // presenting it must not reach her data.
  it("refuses to write into another athlete's week", async () => {
    const { db, app, ana, bea } = await twoClients();
    const { first_week } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-me-cross');

    const res = await app.request(`/api/me/weeks/${first_week.id}/days/1/save`, {
      method: 'POST',
      headers: bea.jsonHeaders,
      body: JSON.stringify({ exercises: [] }),
    });

    expect(res.status).toBe(404);
  });
});

describe('the session is what addresses these routes', () => {
  it('answers 401 without a cookie, on every /me path', async () => {
    const { app } = await twoClients();

    for (const [method, path] of [
      ['GET', '/api/me/profile'],
      ['PUT', '/api/me/profile'],
      ['POST', '/api/me/onboarding'],
      ['GET', '/api/me/plans/active'],
      ['GET', '/api/me/plans/1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'],
      ['GET', '/api/me/weeks/current'],
      ['GET', '/api/me/weeks'],
      ['POST', '/api/me/weeks/1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d/days/1/save'],
      ['PATCH', '/api/me/weeks/1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d/days/1'],
    ] as const) {
      const res = await app.request(path, { method });
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });
});
