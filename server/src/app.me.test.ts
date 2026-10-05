import type { OpenAPIHono } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { getClient, type Db } from './db/index.ts';
import { clients } from './db/schema.ts';
import type { ManagementUser } from './lib/management.ts';
import { createTestHarness, seedClient, type TestClient } from './testkit.ts';

const UUID = '00000000-0000-4000-8000-000000000001';

const onboardingAnswers = {
  sex: 'female',
  age: 34,
  height_in: 65,
  weight_lb: 62,
  goal: 'get_stronger',
  experience: 'intermediate',
  days_per_week: 4,
  rest_day: 7,
};

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

let app: OpenAPIHono;
let db: Db;
let ana: TestClient;
let bruno: TestClient;

const body = async (response: Response): Promise<Record<string, never>> =>
  (await response.json()) as Record<string, never>;
let providerUsers: Map<string, ManagementUser>;

beforeEach(async () => {
  ({ app, db, providerUsers } = createTestHarness());
  ana = await seedClient(db, 'Ana');
  bruno = await seedClient(db, 'Bruno');
});

describe('the guard', () => {
  const guardedPaths: Array<[string, string]> = [
    ['GET', '/api/me'],
    ['PATCH', '/api/me'],
    ['GET', '/api/me/profile'],
    ['PUT', '/api/me/profile'],
    ['POST', '/api/me/onboarding'],
    ['GET', '/api/me/plans/active'],
    ['GET', `/api/me/plans/${UUID}`],
    ['POST', '/api/me/plans/generate'],
    ['GET', '/api/me/weeks/current'],
    ['GET', '/api/me/weeks'],
    ['POST', `/api/me/weeks/${UUID}/days/1/save`],
    ['PATCH', `/api/me/weeks/${UUID}/days/1`],
    ['POST', '/api/wf/complete-week'],
  ];

  it.each(guardedPaths)('rejects %s %s with no credentials', async (method, path) => {
    const response = await app.request(path, { method });

    expect(response.status).toBe(401);
    expect(await body(response)).toEqual({
      error: { code: 'unauthorized', message: 'sign in required' },
    });
  });

  const badCredentials: Array<[string, Record<string, string>]> = [
    ['no header at all', {}],
    ['an empty bearer', { Authorization: 'Bearer ' }],
    ['the wrong scheme', { Authorization: `Basic ${btoa('ana:hunter2')}` }],
    ['a malformed token', { Authorization: 'Bearer not-a-jwt' }],
    ['a token the verifier refuses', { Authorization: 'Bearer expired.token.value' }],
    ['a subject the provider has never heard of', { Authorization: 'Bearer auth0|nobody' }],
  ];

  it.each(badCredentials)('answers %s with one indistinguishable rejection', async (_, headers) => {
    const response = await app.request('/api/me/profile', { headers });

    expect(response.status).toBe(401);
    expect(await body(response)).toEqual({
      error: { code: 'unauthorized', message: 'sign in required' },
    });
  });
});

describe('provisioning on the first request', () => {
  it('creates the athlete the first time a valid token arrives', async () => {
    const subject = 'auth0|newcomer';
    providerUsers.set(subject, { subject, email: 'nadia@example.test', name: 'Nadia' });

    const response = await app.request('/api/me', {
      headers: { Authorization: `Bearer ${subject}` },
    });

    expect(response.status).toBe(200);
    const { client } = (await response.json()) as { client: { id: string; display_name: string } };
    expect(client.display_name).toBe('Nadia');

    const again = await app.request('/api/me', {
      headers: { Authorization: `Bearer ${subject}` },
    });
    expect(((await again.json()) as { client: { id: string } }).client.id).toBe(client.id);
  });
});

describe('GET /api/me', () => {
  it('returns the athlete the token resolves to', async () => {
    const response = await app.request('/api/me', { headers: ana.headers });

    expect(response.status).toBe(200);
    expect(await body(response)).toMatchObject({
      client: { id: ana.id, display_name: 'Ana', status: 'active', unit_preference: 'imperial' },
    });
  });
});

describe('PATCH /api/me', () => {
  it('persists the preference and answers with the updated client', async () => {
    const response = await app.request('/api/me', {
      method: 'PATCH',
      headers: ana.jsonHeaders,
      body: JSON.stringify({ unit_preference: 'metric' }),
    });

    expect(response.status).toBe(200);
    expect(await body(response)).toMatchObject({
      client: { id: ana.id, unit_preference: 'metric' },
    });

    const reread = await app.request('/api/me', { headers: ana.headers });
    expect(await body(reread)).toMatchObject({ client: { unit_preference: 'metric' } });
  });

  it('answers 400 for a unit outside the two-member enum', async () => {
    const response = await app.request('/api/me', {
      method: 'PATCH',
      headers: ana.jsonHeaders,
      body: JSON.stringify({ unit_preference: 'stones' }),
    });

    expect(response.status).toBe(400);
    expect(await body(response)).toMatchObject({ error: { code: 'invalid_input' } });
  });

  it('leaves the other athlete alone', async () => {
    await app.request('/api/me', {
      method: 'PATCH',
      headers: ana.jsonHeaders,
      body: JSON.stringify({ unit_preference: 'metric' }),
    });

    const response = await app.request('/api/me', { headers: bruno.headers });
    expect(await body(response)).toMatchObject({ client: { unit_preference: 'imperial' } });
  });
});

describe('the athlete/identity invariant', () => {
  it('will not let an athlete be deleted out from under their identity', async () => {
    await expect(db.delete(clients).where(eq(clients.id, ana.id))).rejects.toThrow();
    await expect(getClient(db, ana.id)).resolves.not.toBeNull();
  });
});

describe('GET /api/me/profile', () => {
  it('answers 404 before a profile exists', async () => {
    const response = await app.request('/api/me/profile', { headers: ana.headers });

    expect(response.status).toBe(404);
    expect(await body(response)).toMatchObject({ error: { code: 'profile_not_found' } });
  });

  it("returns the caller's own profile, never the other athlete's", async () => {
    await app.request('/api/me/profile', {
      method: 'PUT',
      headers: ana.jsonHeaders,
      body: JSON.stringify({ ...profileWrite, notes: 'ana' }),
    });
    await app.request('/api/me/profile', {
      method: 'PUT',
      headers: bruno.jsonHeaders,
      body: JSON.stringify({ ...profileWrite, notes: 'bruno' }),
    });

    const response = await app.request('/api/me/profile', { headers: ana.headers });

    expect(await body(response)).toMatchObject({
      profile: { client_id: ana.id, notes: 'ana' },
    });
  });
});

describe('PUT /api/me/profile', () => {
  it('writes against the token, with no athlete id in the request', async () => {
    const response = await app.request('/api/me/profile', {
      method: 'PUT',
      headers: ana.jsonHeaders,
      body: JSON.stringify(profileWrite),
    });

    expect(response.status).toBe(200);
    expect(await body(response)).toMatchObject({ profile: { client_id: ana.id } });
  });

  it('answers 400 for an invalid body', async () => {
    const response = await app.request('/api/me/profile', {
      method: 'PUT',
      headers: ana.jsonHeaders,
      body: JSON.stringify({ ...profileWrite, age: 'thirty-four' }),
    });

    expect(response.status).toBe(400);
    expect(await body(response)).toMatchObject({ error: { code: 'invalid_input' } });
  });
});

describe('POST /api/me/onboarding', () => {
  it('writes a profile against the token, with no athlete id in the request', async () => {
    const response = await app.request('/api/me/onboarding', {
      method: 'POST',
      headers: ana.jsonHeaders,
      body: JSON.stringify(onboardingAnswers),
    });

    expect(response.status).toBe(200);
    expect(await body(response)).toMatchObject({ profile: { client_id: ana.id } });
  });

  it('answers 400 for an invalid body', async () => {
    const response = await app.request('/api/me/onboarding', {
      method: 'POST',
      headers: ana.jsonHeaders,
      body: JSON.stringify({ ...onboardingAnswers, days_per_week: 12 }),
    });

    expect(response.status).toBe(400);
    expect(await body(response)).toMatchObject({ error: { code: 'invalid_input' } });
  });

  it('keeps a malformed JSON body inside the error envelope', async () => {
    const response = await app.request('/api/me/onboarding', {
      method: 'POST',
      headers: ana.jsonHeaders,
      body: '{ not json',
    });

    expect(response.status).toBe(400);
    expect(await body(response)).toMatchObject({ error: { code: 'invalid_input' } });
  });
});

describe('removed endpoints stay unrouted', () => {
  const gone: Array<[string, string]> = [
    ['POST', '/auth/sign-up'],
    ['POST', '/auth/sign-in'],
    ['POST', '/auth/sign-out'],
    ['GET', '/auth/session'],
    ['GET', '/api/clients'],
    ['GET', `/api/clients/${UUID}`],
  ];

  it.each(gone)('%s %s is not routed', async (method, path) => {
    const response = await app.request(path, { method, headers: ana.jsonHeaders });

    expect(response.status).toBe(404);
  });
});
