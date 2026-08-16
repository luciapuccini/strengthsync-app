import { sign } from 'hono/jwt';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { describe, expect, it } from 'vitest';

import { clientCredentials, clients, coaches } from './db/schema.ts';
import { createDemoSeededDb, createTestDb } from './db/testing/index.ts';

import { INVITE_CODE, SESSION_SECRET, createTestApp } from './testkit.ts';

const CREDENTIALS = {
  display_name: 'Ana',
  email: 'ana@example.com',
  password: 'dev-password-123',
  invite_code: INVITE_CODE,
};

// `app.request` is typed `Response | Promise<Response>`; awaiting inside these
// async helpers narrows it once here rather than at every call site.
async function signUp(
  app: OpenAPIHono,
  body: Record<string, unknown> = CREDENTIALS,
): Promise<Response> {
  return app.request('/auth/sign-up', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function signIn(app: OpenAPIHono, body: Record<string, unknown>): Promise<Response> {
  return app.request('/auth/sign-in', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** The session cookie's value, or undefined if the response set no cookie. */
function sessionCookie(res: Response): string | undefined {
  return res.headers.get('set-cookie')?.match(/session=([^;]*)/)?.[1];
}

async function withSession(app: OpenAPIHono, token: string): Promise<Response> {
  return app.request('/auth/session', { headers: { cookie: `session=${token}` } });
}

async function clientOf(res: Response): Promise<{ id: string; coach_id: string }> {
  return ((await res.json()) as { client: { id: string; coach_id: string } }).client;
}

describe('sign-up', () => {
  it('creates the client, returns it, and sets a session cookie', async () => {
    const app = createTestApp();
    const res = await signUp(app);

    expect(res.status).toBe(201);
    expect((await clientOf(res)).id).toEqual(expect.any(String));
    expect(sessionCookie(res)).toBeTruthy();
  });

  it('creates a credential that can immediately be signed in with', async () => {
    const app = createTestApp();
    await signUp(app);

    const res = await signIn(app, { email: CREDENTIALS.email, password: CREDENTIALS.password });
    expect(res.status).toBe(200);
  });

  it('attaches the new client to the seeded coach', async () => {
    const db = createTestDb();
    const app = createTestApp({ db });
    const client = await clientOf(await signUp(app));

    const [coach] = await db.select().from(coaches).limit(1);
    expect(client.coach_id).toBe(coach?.id);
  });

  it('returns 409 for an email already registered, whatever its casing', async () => {
    const app = createTestApp();
    await signUp(app);

    const res = await signUp(app, { ...CREDENTIALS, email: 'ANA@example.com' });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'email_already_registered',
    );
  });

  it('returns 400 for a password shorter than eight characters', async () => {
    const app = createTestApp();
    const res = await signUp(app, { ...CREDENTIALS, password: 'short7c' });
    expect(res.status).toBe(400);
  });
});

// docs/mvp.md §2: the cohort is exactly the people who were invited, and the
// gate is what makes the model spend bounded — so the rejection has to happen
// before anything is written, not be cleaned up afterwards.
describe('the invite code gate', () => {
  it('rejects a wrong code with 403 invalid_invite_code, writing nothing', async () => {
    const db = createTestDb();
    const app = createTestApp({ db });

    const res = await signUp(app, { ...CREDENTIALS, invite_code: 'not-the-code' });

    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'invalid_invite_code',
    );
    expect(sessionCookie(res)).toBeUndefined();
    expect(await db.select().from(clients)).toEqual([]);
    expect(await db.select().from(clientCredentials)).toEqual([]);
  });

  it('rejects a missing code before any write', async () => {
    const db = createTestDb();
    const app = createTestApp({ db });
    const { invite_code: _omitted, ...withoutCode } = CREDENTIALS;

    const res = await signUp(app, withoutCode);

    expect(res.status).toBe(400);
    expect(await db.select().from(clients)).toEqual([]);
    expect(await db.select().from(clientCredentials)).toEqual([]);
  });

  // Fail closed: a Worker deployed without the secret set must not register
  // everyone who guesses an empty string, and a whitespace-only submission
  // trims to that same empty string.
  it('registers nobody when the secret is unset', async () => {
    const app = createTestApp({ inviteCode: '' });

    expect((await signUp(app, { ...CREDENTIALS, invite_code: ' ' })).status).toBe(403);
    expect((await signUp(app)).status).toBe(403);
  });

  it('accepts the current code and records it on the client row', async () => {
    const db = createTestDb();
    const app = createTestApp({ db });

    const res = await signUp(app);
    expect(res.status).toBe(201);

    const [row] = await db.select().from(clients);
    expect(row?.invite_code).toBe(INVITE_CODE);
  });

  // The code is a shared per-batch secret: echoing it back would let one
  // invitee read it off their own session and pass it on.
  it('never returns the code it accepted', async () => {
    const app = createTestApp();
    const body = (await (await signUp(app)).json()) as { client: Record<string, unknown> };

    expect(body.client).not.toHaveProperty('invite_code');
  });
});

describe('sign-in', () => {
  it('returns the client and a session cookie for correct credentials', async () => {
    const app = createTestApp();
    const registered = await clientOf(await signUp(app));

    const res = await signIn(app, { email: CREDENTIALS.email, password: CREDENTIALS.password });
    expect(res.status).toBe(200);
    expect((await clientOf(res)).id).toBe(registered.id);
    expect(sessionCookie(res)).toBeTruthy();
  });

  it('answers a wrong password and an unknown email identically, with 401 and no cookie', async () => {
    const app = createTestApp();
    await signUp(app);

    const wrongPassword = await signIn(app, {
      email: CREDENTIALS.email,
      password: 'wrong-password',
    });
    const unknownEmail = await signIn(app, {
      email: 'nobody@example.com',
      password: CREDENTIALS.password,
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(await wrongPassword.text()).toBe(await unknownEmail.text());
    expect(sessionCookie(wrongPassword)).toBeUndefined();
  });
});

describe('sign-out', () => {
  it('clears the session cookie', async () => {
    const app = createTestApp();
    const res = await app.request('/auth/sign-out', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(sessionCookie(res)).toBe('');
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});

describe('session bootstrap', () => {
  it('returns the signed-in client for a valid cookie', async () => {
    const app = createTestApp();
    const signUpRes = await signUp(app);
    const registered = await clientOf(signUpRes);

    const res = await withSession(app, sessionCookie(signUpRes) as string);
    expect(res.status).toBe(200);
    expect((await clientOf(res)).id).toBe(registered.id);
  });

  it('returns 401 with no cookie', async () => {
    const app = createTestApp();
    expect((await app.request('/auth/session')).status).toBe(401);
  });

  it('returns 401 for a tampered cookie', async () => {
    const app = createTestApp();
    const token = sessionCookie(await signUp(app)) as string;
    const [header, payload, signature] = token.split('.');

    expect((await withSession(app, `${header}.${payload}.${signature}x`)).status).toBe(401);
    expect((await withSession(app, 'not-a-jwt')).status).toBe(401);
  });

  it('returns 401 for an expired cookie', async () => {
    const app = createTestApp();
    const client = await clientOf(await signUp(app));
    const now = Math.floor(Date.now() / 1000);
    const expired = await sign(
      { sub: client.id, iat: now - 120, exp: now - 60 },
      SESSION_SECRET,
      'HS256',
    );

    expect((await withSession(app, expired)).status).toBe(401);
  });
});

// The credential seed is only worth committing if it actually opens the demo
// athlete's data. Asserted here against the seed files themselves, so it does
// not rest on someone remembering to try it in a browser.
describe('the seeded demo athlete', () => {
  const DEMO = { email: 'lucia@example.com', password: 'dev-password-123' };
  const DEMO_CLIENT_ID = '00000000-0000-4000-8000-000000000010';

  it('signs in with the documented credential', async () => {
    const app = createTestApp({ db: createDemoSeededDb() });
    const res = await signIn(app, DEMO);

    expect(res.status).toBe(200);
    expect((await clientOf(res)).id).toBe(DEMO_CLIENT_ID);
  });

  // The cookie is the whole address: the seeded id appears nowhere in these
  // requests, only in the assertion about what came back.
  it('reaches their plan and history under that identity', async () => {
    const app = createTestApp({ db: createDemoSeededDb() });
    const res = await signIn(app, DEMO);
    const headers = { cookie: `session=${sessionCookie(res)}` };

    const plan = (await (await app.request('/api/me/plans/active', { headers })).json()) as {
      plan: { id: string };
    };
    const history = (await (
      await app.request(`/api/me/weeks?status=completed&planId=${plan.plan.id}`, { headers })
    ).json()) as { weeks: unknown[] };

    expect(plan.plan.id).toBe('00000000-0000-4000-8000-000000000012');
    expect(history.weeks.length).toBeGreaterThan(0);
  });

  // The seed's in-flight week is anchored to the Monday on-or-before "now"
  // (see 001_demo_seed.sql), not a fixed calendar date, so it never expires.
  // Asserted here rather than left to be discovered, so a future re-pin to
  // fixed dates has a test that notices.
  it('has a current week, in flight and containing today', async () => {
    const app = createTestApp({ db: createDemoSeededDb() });
    const signedIn = await signIn(app, DEMO);

    const res = await app.request('/api/me/weeks/current', {
      headers: { cookie: `session=${sessionCookie(signedIn)}` },
    });
    expect(res.status).toBe(200);
    const { week } = (await res.json()) as {
      week: { id: string; status: string; start_date: string; end_date: string };
    };
    expect(week.id).toBe('00000000-0000-4000-8000-000000000013');
    expect(week.status).toBe('in_flight');
    const today = new Date().toISOString().slice(0, 10);
    expect(week.start_date <= today && today <= week.end_date).toBe(true);
  });
});

// The attributes are the same everywhere now, so there is no NODE_ENV to set:
// `Secure` was the last thing in the auth path reading it, and it read a value
// wrangler substitutes at build time rather than one the runtime knows.
describe('session cookie attributes', () => {
  it('is Secure, HttpOnly, SameSite=Lax and path-wide', async () => {
    const header = (await signUp(createTestApp())).headers.get('set-cookie');
    expect(header).toContain('Secure');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Path=/');
  });

  // Host-only, so the cookie stays on app.strengthsync.ai and never reaches the
  // apex, where the marketing site is served from another repository.
  it('sets no Domain, on either the issued or the cleared cookie', async () => {
    const app = createTestApp();
    const issued = await signUp(app);
    expect(issued.headers.get('set-cookie')).not.toContain('Domain');

    const cleared = await app.request('/auth/sign-out', {
      method: 'POST',
      headers: { cookie: `session=${sessionCookie(issued)}` },
    });
    expect(cleared.headers.get('set-cookie')).not.toContain('Domain');
  });
});
