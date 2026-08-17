import { sign } from 'hono/jwt';
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { weeks } from './db/schema.ts';
import { addDays, createTestDb, todayIso } from './db/testing/index.ts';

import {
  SESSION_SECRET,
  activateGeneratedPlanViaRepository,
  createTestApp,
  signUpViaApi,
  upsertProfileViaApi,
} from './testkit.ts';

/**
 * The public HTTP surface: the guard, the error envelope, and the edge cases
 * that are not about who is asking. Everything about *whose* data a route
 * returns lives in `app.me.test.ts`, which is where the /clients tests this
 * file used to hold were retargeted when `issues/auth/013` deleted those paths.
 */

const NO_SUCH_UUID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

describe('health + auth', () => {
  it('GET /health is unauthenticated', async () => {
    const app = createTestApp();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  // These four replace the tests that pinned authentication as production-only.
  // The guard now runs in every environment, so there is no NODE_ENV to set.
  it('rejects /api/* without a cookie', async () => {
    const app = createTestApp();
    expect((await app.request('/api/me/profile')).status).toBe(401);
  });

  it('rejects /api/* with a tampered cookie', async () => {
    const app = createTestApp();
    const client = await signUpViaApi(app);
    const tampered = `${client.headers.cookie}x`;

    expect((await app.request('/api/me/profile', { headers: { cookie: tampered } })).status).toBe(
      401,
    );
    expect(
      (await app.request('/api/me/profile', { headers: { cookie: 'session=nonsense' } })).status,
    ).toBe(401);
  });

  it('rejects /api/* with an expired cookie', async () => {
    const app = createTestApp();
    const client = await signUpViaApi(app);
    const now = Math.floor(Date.now() / 1000);
    const expired = await sign(
      { sub: client.id, iat: now - 120, exp: now - 60 },
      SESSION_SECRET,
      'HS256',
    );

    const res = await app.request('/api/me/profile', { headers: { cookie: `session=${expired}` } });
    expect(res.status).toBe(401);
  });

  it('leaves the way in open: sign-up, sign-in and sign-out need no cookie', async () => {
    const app = createTestApp();
    await signUpViaApi(app);

    const signIn = await app.request('/auth/sign-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'ana@example.com', password: 'dev-password-123' }),
    });
    const signOut = await app.request('/auth/sign-out', { method: 'POST' });

    expect(signIn.status).toBe(200);
    expect(signOut.status).toBe(200);
  });
});

describe('the error envelope', () => {
  it('returns 400 invalid_id for a malformed uuid in the path', async () => {
    const app = createTestApp();
    const client = await signUpViaApi(app);
    const res = await app.request('/api/me/plans/not-a-uuid', { headers: client.headers });

    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid_id');
  });

  it('rejects an invalid body with 400 invalid_input', async () => {
    const app = createTestApp();
    const client = await signUpViaApi(app);
    const res = await app.request('/api/me/profile', {
      method: 'PUT',
      headers: client.jsonHeaders,
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid_input');
  });

  it('keeps a malformed JSON body inside the error envelope', async () => {
    // Hono rejects unparseable JSON before any validator runs; app.ts maps that
    // 400 back into { error: { code, message } } so the UI can read it.
    const app = createTestApp();
    const client = await signUpViaApi(app);
    const res = await app.request('/api/me/profile', {
      method: 'PUT',
      headers: client.jsonHeaders,
      body: '{ not json',
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid_input');
  });

  // What `client_not_found` now means. It used to mean "you named an id that
  // matches nobody", which is no longer expressible; the remaining way to reach
  // it is the one the /me handlers guard against — a cookie that outlives the
  // row it names, which it can do by up to thirty days.
  it('returns 404 client_not_found when a valid session names a deleted client', async () => {
    const app = createTestApp();
    const now = Math.floor(Date.now() / 1000);
    const ghost = await sign(
      { sub: NO_SUCH_UUID, iat: now, exp: now + 3600 },
      SESSION_SECRET,
      'HS256',
    );

    const res = await app.request('/api/me/weeks', { headers: { cookie: `session=${ghost}` } });
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('client_not_found');
  });
});

describe('removed endpoints', () => {
  // The first three were cut in issues/002: no UI caller, no product need. The
  // rest are every path that named an athlete, cut in issues/auth/013 once the
  // session addressed the API instead. Pinned so a future route definition
  // cannot quietly reintroduce them alongside the contract.
  it('no longer routes the endpoints cut from the public surface', async () => {
    const db = createTestDb();
    const app = createTestApp({ db });
    const client = await signUpViaApi(app);
    const { plan, first_week } = await activateGeneratedPlanViaRepository(db, client.id, 'wf-cut');

    for (const [method, path] of [
      ['GET', `/api/clients/${client.id}`],
      ['GET', `/api/clients/${client.id}/plans`],
      ['GET', `/api/clients/${client.id}/weeks/${first_week.id}`],
      ['GET', '/api/clients'],
      ['POST', '/api/clients'],
      ['GET', `/api/clients/${client.id}/profile`],
      ['PUT', `/api/clients/${client.id}/profile`],
      ['GET', `/api/clients/${client.id}/plans/active`],
      ['GET', `/api/clients/${client.id}/plans/${plan.id}`],
      ['GET', `/api/clients/${client.id}/weeks/current`],
      ['GET', `/api/clients/${client.id}/weeks`],
      ['POST', `/api/clients/${client.id}/weeks/${first_week.id}/days/1/save`],
      ['PATCH', `/api/clients/${client.id}/weeks/${first_week.id}/days/1`],
    ] as const) {
      const res = await app.request(path, { method, headers: client.jsonHeaders });
      expect(res.status, `${method} ${path} should not be routed`).toBe(404);
    }
  });
});

describe('training reads', () => {
  it('returns 404 when the in_flight week has not started yet', async () => {
    const db = createTestDb();
    const app = createTestApp({ db });
    const client = await signUpViaApi(app);
    await upsertProfileViaApi(app, client);
    const { first_week } = await activateGeneratedPlanViaRepository(
      db,
      client.id,
      'wf-future-week',
    );
    const futureStart = addDays(todayIso(), 7);
    await db
      .update(weeks)
      .set({ start_date: futureStart, end_date: addDays(futureStart, 6) })
      .where(eq(weeks.id, first_week.id));

    const res = await app.request('/api/me/weeks/current', { headers: client.headers });
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'current_week_not_found',
    );
  });
});

describe('week route parameters', () => {
  it('rejects an out-of-range or non-numeric dayIndex with 400 invalid_input', async () => {
    // dayIndex is a coerced path param, but a bad one is a bad value rather than
    // an unusable route id, so it keeps invalid_input (see #003's mapping).
    const db = createTestDb();
    const app = createTestApp({ db });
    const client = await signUpViaApi(app);
    const { first_week } = await activateGeneratedPlanViaRepository(db, client.id, 'wf-day-index');

    for (const dayIndex of ['0', '8', 'abc']) {
      const res = await app.request(`/api/me/weeks/${first_week.id}/days/${dayIndex}/save`, {
        method: 'POST',
        headers: client.jsonHeaders,
        body: JSON.stringify({ exercises: [] }),
      });
      expect(res.status, `dayIndex=${dayIndex}`).toBe(400);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid_input');
    }
  });
});

describe('day log writes', () => {
  it('rejects a day patch whose skipped exercise carries sets (400)', async () => {
    const db = createTestDb();
    const app = createTestApp({ db });
    const client = await signUpViaApi(app);
    const { first_week } = await activateGeneratedPlanViaRepository(db, client.id, 'wf-setup');

    const res = await app.request(`/api/me/weeks/${first_week.id}/days/1`, {
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
    });
    expect(res.status).toBe(400);
  });
});

describe('workflow trigger', () => {
  // Tracks which clientId(s) actually reached the workflow binding, so a 401
  // can be shown to have started nothing rather than just returned the right
  // status.
  function stubEnv(): { env: object; calls: string[] } {
    const calls: string[] = [];
    return {
      calls,
      env: {
        STRENGTHSYNC_WORKFLOW: {
          create: async ({ params }: { params: { clientId: string } }) => {
            calls.push(params.clientId);
            return {
              id: `instance-for-${params.clientId}`,
              status: async () => ({ status: 'queued' }),
            };
          },
        },
      },
    };
  }

  it('rejects /api/wf/complete-week without a cookie and starts no workflow', async () => {
    const { env, calls } = stubEnv();
    const res = await createTestApp().request('/api/wf/complete-week', { method: 'POST' }, env);
    expect(res.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it('starts a workflow instance for the signed-in client, from the session', async () => {
    const app = createTestApp();
    const client = await signUpViaApi(app);
    const { env, calls } = stubEnv();

    const res = await app.request(
      '/api/wf/complete-week',
      { method: 'POST', headers: client.headers },
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { instanceId: string };
    expect(body.instanceId).toBe(`instance-for-${client.id}`);
    expect(calls).toEqual([client.id]);
  });
});

/**
 * The PostHog proxy (`routes/ingest.ts`). It exists so captures leave the
 * browser same-origin and survive content blockers; these pin the two things
 * that quietly break when they are wrong — where a request lands, and what
 * rides along with it.
 */
describe('/ingest', () => {
  /** `forwarded()` is what the proxy sent upstream, and fails if it sent nothing. */
  function stubFetch(): { fetcher: typeof fetch; forwarded: () => Request } {
    const calls: Request[] = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(new Request(input as RequestInfo, init));
      return new Response('1', { status: 200 });
    }) as typeof fetch;
    return {
      fetcher,
      forwarded: () => {
        const [first, ...rest] = calls;
        expect(rest).toEqual([]);
        if (first === undefined) throw new Error('the proxy forwarded nothing upstream');
        return first;
      },
    };
  }

  it('forwards captures to the PostHog ingestion host, path and query intact', async () => {
    const { fetcher, forwarded } = stubFetch();
    const app = createTestApp({ ingestFetch: fetcher });

    const res = await app.request('/ingest/i/v0/e/?compression=gzip-js&ver=1.417.1', {
      method: 'POST',
      body: '{"event":"day saved"}',
    });

    expect(res.status).toBe(200);
    const upstream = forwarded();
    expect(upstream.url).toBe('https://us.i.posthog.com/i/v0/e/?compression=gzip-js&ver=1.417.1');
    expect(await upstream.text()).toBe('{"event":"day saved"}');
  });

  // posthog-js loads its optional bundles from a different host than it
  // captures to, so one rewrite cannot serve both.
  it('forwards /ingest/static to the assets host', async () => {
    const { fetcher, forwarded } = stubFetch();
    const app = createTestApp({ ingestFetch: fetcher });

    await app.request('/ingest/static/array.js');

    expect(forwarded().url).toBe('https://us-assets.i.posthog.com/static/array.js');
  });

  // Same-origin means the browser attaches the session cookie unprompted.
  // Forwarding it would hand PostHog a token that speaks for the athlete.
  it('never forwards the session cookie upstream', async () => {
    const { fetcher, forwarded } = stubFetch();
    const app = createTestApp({ ingestFetch: fetcher });
    const client = await signUpViaApi(app);

    await app.request('/ingest/i/v0/e/', {
      method: 'POST',
      headers: { ...client.headers, 'content-type': 'text/plain' },
      body: '{}',
    });

    const upstream = forwarded();
    expect(upstream.headers.get('cookie')).toBeNull();
    expect(upstream.headers.get('content-type')).toBe('text/plain');
  });

  it('is reachable without a session', async () => {
    const { fetcher } = stubFetch();
    const res = await createTestApp({ ingestFetch: fetcher }).request('/ingest/i/v0/e/', {
      method: 'POST',
      body: '{}',
    });
    expect(res.status).toBe(200);
  });
});
