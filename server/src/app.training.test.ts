import type { OpenAPIHono } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addDays, todayIso, upsertProfile, type Db } from './db/index.ts';
import { weeks } from './db/schema.ts';
import {
  activateGeneratedPlanViaRepository,
  createTestHarness,
  seedClient,
  type TestClient,
} from './testkit.ts';

/**
 * What the athlete a token names can reach: their plans, their weeks, their day
 * logs, and the workflow that closes a week.
 *
 * The training half of the inventory restored by
 * `issues/012-token-verification-and-provisioning.md`; the identity half is in
 * `app.me.test.ts`. Almost every case here has a second athlete in it, because
 * the interesting assertion is usually the 404 rather than the 200 — this is an
 * API where a caller cannot name anybody but themselves, and that is a property
 * only a second athlete can demonstrate.
 */

const UUID = '00000000-0000-4000-8000-000000000001';

const profileWrite = {
  snapshot_date: '2026-07-01',
  sex: 'female',
  age: 34,
  height_in: 65,
  goals: { primary: 'strength' },
  body_composition: { weight_lb: 62 },
  strength_loads: { press_banca_lb: 135 },
  nutrition: { calories: 2100 },
  activities: null,
  schedule_preferences: { days_per_week: 4 },
  notes: null,
};

const dayLog = (over: Record<string, unknown> = {}) => ({
  exercises: [
    {
      exercise_key: 'press_banca',
      skipped: false,
      feedback: null,
      sets: [{ performed_reps: 8, performed_weight_lb: 60 }],
      ...over,
    },
  ],
});

let app: OpenAPIHono;
let db: Db;
let ana: TestClient;
let bruno: TestClient;

const body = async (response: Response): Promise<Record<string, never>> =>
  (await response.json()) as Record<string, never>;

beforeEach(async () => {
  ({ app, db } = createTestHarness());
  ana = await seedClient(db, 'Ana');
  bruno = await seedClient(db, 'Bruno');
});

describe('plans', () => {
  it('answers 404 for the active plan before activation', async () => {
    const response = await app.request('/api/me/plans/active', { headers: ana.headers });

    expect(response.status).toBe(404);
    expect(await body(response)).toMatchObject({ error: { code: 'active_plan_not_found' } });
  });

  it("returns the caller's active plan", async () => {
    const { plan } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-ana');

    const response = await app.request('/api/me/plans/active', { headers: ana.headers });

    expect(response.status).toBe(200);
    expect(await body(response)).toMatchObject({ plan: { id: plan.id, client_id: ana.id } });
  });

  it("returns the caller's plan by id", async () => {
    const { plan } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-ana');

    const response = await app.request(`/api/me/plans/${plan.id}`, { headers: ana.headers });

    expect(response.status).toBe(200);
    expect(await body(response)).toMatchObject({ plan: { id: plan.id } });
  });

  it("answers 404 for another athlete's plan id", async () => {
    const { plan } = await activateGeneratedPlanViaRepository(db, bruno.id, 'wf-bruno');

    // Not 403: the plan is not merely off limits, it does not exist as far as
    // this caller can tell. A 403 would confirm the id names something real.
    const response = await app.request(`/api/me/plans/${plan.id}`, { headers: ana.headers });

    expect(response.status).toBe(404);
    expect(await body(response)).toMatchObject({ error: { code: 'plan_not_found' } });
  });

  it('answers 400 for a malformed plan id', async () => {
    const response = await app.request('/api/me/plans/not-a-uuid', { headers: ana.headers });

    expect(response.status).toBe(400);
    expect(await body(response)).toMatchObject({ error: { code: 'invalid_id' } });
  });

  it('refuses to generate for an athlete with no profile', async () => {
    // Refused before the model call, so an athlete who has not onboarded cannot
    // spend the OpenAI budget.
    const response = await app.request('/api/me/plans/generate', {
      method: 'POST',
      headers: ana.headers,
    });

    expect(response.status).toBe(409);
    expect(await body(response)).toMatchObject({ error: { code: 'profile_required' } });
  });

  it('refuses to generate for an athlete who already has an active plan', async () => {
    await upsertProfile(db, ana.id, profileWrite);
    await activateGeneratedPlanViaRepository(db, ana.id, 'wf-ana');

    const response = await app.request('/api/me/plans/generate', {
      method: 'POST',
      headers: ana.headers,
    });

    expect(response.status).toBe(409);
    expect(await body(response)).toMatchObject({ error: { code: 'plan_already_active' } });
  });
});

describe('weeks', () => {
  it('answers 404 for the current week before a plan exists', async () => {
    const response = await app.request('/api/me/weeks/current', { headers: ana.headers });

    expect(response.status).toBe(404);
    expect(await body(response)).toMatchObject({ error: { code: 'current_week_not_found' } });
  });

  it("returns the caller's in-flight week", async () => {
    const { first_week } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-ana');

    const response = await app.request('/api/me/weeks/current', { headers: ana.headers });

    expect(response.status).toBe(200);
    expect(await body(response)).toMatchObject({
      week: { id: first_week.id, status: 'in_flight' },
    });
  });

  it('answers 404 when the in-flight week has not started yet', async () => {
    // A week is in_flight from the moment it is created, but `getCurrentWeek`
    // also asks whether today falls inside it. Without that, an athlete whose
    // next week has been written ahead of time would be shown days they cannot
    // yet train and cannot log.
    const { first_week } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-ana');
    const start = addDays(todayIso(), 7);
    await db
      .update(weeks)
      .set({ start_date: start, end_date: addDays(start, 6) })
      .where(eq(weeks.id, first_week.id));

    const response = await app.request('/api/me/weeks/current', { headers: ana.headers });

    expect(response.status).toBe(404);
    expect(await body(response)).toMatchObject({ error: { code: 'current_week_not_found' } });
  });

  it('lists only the caller’s weeks', async () => {
    await activateGeneratedPlanViaRepository(db, ana.id, 'wf-ana');
    await activateGeneratedPlanViaRepository(db, bruno.id, 'wf-bruno');

    const response = await app.request('/api/me/weeks', { headers: ana.headers });

    const { weeks } = (await response.json()) as { weeks: Array<{ client_id: string }> };
    expect(weeks).toHaveLength(1);
    expect(weeks[0]?.client_id).toBe(ana.id);
  });

  it('filters the list by planId', async () => {
    const { plan } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-ana');

    const mine = await app.request(`/api/me/weeks?planId=${plan.id}`, { headers: ana.headers });
    const other = await app.request(`/api/me/weeks?planId=${UUID}`, { headers: ana.headers });

    expect(((await mine.json()) as { weeks: unknown[] }).weeks).toHaveLength(1);
    expect(((await other.json()) as { weeks: unknown[] }).weeks).toHaveLength(0);
  });

  it('answers 400 for an invalid status filter', async () => {
    const response = await app.request('/api/me/weeks?status=nonsense', { headers: ana.headers });

    expect(response.status).toBe(400);
    expect(await body(response)).toMatchObject({ error: { code: 'invalid_input' } });
  });
});

describe('day log writes', () => {
  let weekId: string;

  beforeEach(async () => {
    const { first_week } = await activateGeneratedPlanViaRepository(db, ana.id, 'wf-ana');
    weekId = first_week.id;
  });

  it('saves a day and marks it completed', async () => {
    const response = await app.request(`/api/me/weeks/${weekId}/days/1/save`, {
      method: 'POST',
      headers: ana.jsonHeaders,
      body: JSON.stringify(dayLog()),
    });

    expect(response.status).toBe(200);
    const { week } = (await response.json()) as {
      week: { schedule: Array<{ day_index: number; completed: boolean }> };
    };
    expect(week.schedule.find((day) => day.day_index === 1)?.completed).toBe(true);
  });

  it('patches a day', async () => {
    const response = await app.request(`/api/me/weeks/${weekId}/days/1`, {
      method: 'PATCH',
      headers: ana.jsonHeaders,
      body: JSON.stringify({ completed: false, ...dayLog() }),
    });

    expect(response.status).toBe(200);
    const { week } = (await response.json()) as {
      week: { schedule: Array<{ day_index: number; completed: boolean }> };
    };
    expect(week.schedule.find((day) => day.day_index === 1)?.completed).toBe(false);
  });

  it("refuses to write into another athlete's week", async () => {
    // The week id is the caller's only free choice in these paths, and the
    // repository scopes it to them — so naming someone else's finds nothing.
    const response = await app.request(`/api/me/weeks/${weekId}/days/1/save`, {
      method: 'POST',
      headers: bruno.jsonHeaders,
      body: JSON.stringify(dayLog()),
    });

    expect(response.status).toBe(404);
    expect(await body(response)).toMatchObject({ error: { code: 'week_not_found' } });
  });

  it('answers 400 for a malformed week id', async () => {
    const response = await app.request('/api/me/weeks/not-a-uuid/days/1/save', {
      method: 'POST',
      headers: ana.jsonHeaders,
      body: JSON.stringify(dayLog()),
    });

    expect(response.status).toBe(400);
    expect(await body(response)).toMatchObject({ error: { code: 'invalid_id' } });
  });

  it.each(['0', '8', 'monday'])('answers 400 for dayIndex %s', async (dayIndex) => {
    // Out of range and non-numeric are both `invalid_input` rather than
    // `invalid_id`: the day index is a value, not an identifier.
    const response = await app.request(`/api/me/weeks/${weekId}/days/${dayIndex}/save`, {
      method: 'POST',
      headers: ana.jsonHeaders,
      body: JSON.stringify(dayLog()),
    });

    expect(response.status).toBe(400);
    expect(await body(response)).toMatchObject({ error: { code: 'invalid_input' } });
  });

  it('answers 400 for a skipped exercise that carries sets', async () => {
    // A cross-field rule with no JSON Schema representation, so it exists only
    // on the server and only this case proves it runs.
    const response = await app.request(`/api/me/weeks/${weekId}/days/1`, {
      method: 'PATCH',
      headers: ana.jsonHeaders,
      body: JSON.stringify({ completed: true, ...dayLog({ skipped: true }) }),
    });

    expect(response.status).toBe(400);
    expect(await body(response)).toMatchObject({ error: { code: 'invalid_input' } });
  });
});

describe('the workflow trigger', () => {
  const workflowEnv = () => {
    const create = vi.fn(async () => ({
      id: 'wf-instance-1',
      status: async () => ({ status: 'running' }),
    }));
    return { env: { STRENGTHSYNC_WORKFLOW: { create } }, create };
  };

  it('starts an instance for the authenticated athlete', async () => {
    const { env, create } = workflowEnv();

    const response = await app.request(
      '/api/wf/complete-week',
      { method: 'POST', headers: ana.headers },
      env,
    );

    expect(response.status).toBe(200);
    expect(await body(response)).toMatchObject({ instanceId: 'wf-instance-1' });
    expect(create).toHaveBeenCalledWith({ params: { clientId: ana.id } });
  });

  it('starts no workflow without a token', async () => {
    const { env, create } = workflowEnv();

    const response = await app.request('/api/wf/complete-week', { method: 'POST' }, env);

    expect(response.status).toBe(401);
    // The assertion that matters: rejecting late, after the side effect, would
    // still answer 401 and still have started the workflow.
    expect(create).not.toHaveBeenCalled();
  });
});
