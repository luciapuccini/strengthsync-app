import type { OpenAPIHono } from '@hono/zod-openapi';

import { activateGeneratedPlan, type Db } from './db/index.ts';
import { createTestDb } from './db/testing/index.ts';
import type { PlanDay, Week } from './domain/model/index.ts';

import { createApp, type AppConfig } from './app.ts';

export const SESSION_SECRET = 'test-session-secret';
/** The code `createTestApp` gates sign-up on; the real one is a Worker secret. */
export const INVITE_CODE = 'test-invite-code';

/**
 * A registered athlete and the cookie that speaks for them. Every /api/* request
 * needs one, so tests get the id and the headers together rather than assembling
 * a cookie at each call site.
 */
export type TestClient = {
  id: string;
  /** Cookie only, for reads. */
  headers: Record<string, string>;
  /** Cookie plus a JSON content type, for writes. */
  jsonHeaders: Record<string, string>;
};

export function createTestApp(overrides: Partial<AppConfig> = {}): OpenAPIHono {
  return createApp({
    db: createTestDb(),
    sessionSecret: SESSION_SECRET,
    inviteCode: INVITE_CODE,
    ...overrides,
  });
}

/**
 * Register an athlete and keep their session. This replaced the athlete-creation
 * route as the way tests get a client: that route is now behind the guard, so
 * reaching it would need the very session this produces.
 */
export async function signUpViaApi(app: OpenAPIHono, displayName = 'Ana'): Promise<TestClient> {
  const res = await app.request('/auth/sign-up', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      display_name: displayName,
      email: `${displayName.toLowerCase()}@example.com`,
      password: 'dev-password-123',
      invite_code: INVITE_CODE,
    }),
  });
  const token = res.headers.get('set-cookie')?.match(/session=([^;]*)/)?.[1];
  if (!token) throw new Error(`sign-up set no session cookie (status ${res.status})`);

  const { client } = (await res.json()) as { client: { id: string } };
  const headers = { cookie: `session=${token}` };
  return {
    id: client.id,
    headers,
    jsonHeaders: { ...headers, 'content-type': 'application/json' },
  };
}

export async function upsertProfileViaApi(app: OpenAPIHono, client: TestClient): Promise<void> {
  await app.request('/api/me/profile', {
    method: 'PUT',
    headers: client.jsonHeaders,
    body: JSON.stringify({
      snapshot_date: '2026-07-01',
      sex: 'female',
      age: 34,
      height_cm: 165,
      goals: { primary: 'strength' },
      body_composition: { weight_kg: 62 },
      strength_loads: { press_banca: 60 },
      nutrition: null,
      activities: null,
      schedule_preferences: null,
      notes: null,
    }),
  });
}

export const weekTemplate: PlanDay[] = [
  {
    day_index: 1,
    type: 'upper_body',
    notes: null,
    exercises: [
      {
        exercise_key: 'press_banca',
        name: 'Bench press',
        series: 4,
        reps: 8,
        rest_time_sec: 120,
        weight_kg: 60,
        notes: null,
      },
    ],
  },
];

export async function activateGeneratedPlanViaRepository(
  db: Db,
  clientId: string,
  workflowId: string,
): Promise<{ plan: { id: string }; first_week: Week }> {
  const result = await activateGeneratedPlan(db, clientId, {
    workflow_id: workflowId,
    plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
  });
  return { plan: { id: result.plan.id }, first_week: result.first_week };
}
