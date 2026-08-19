import { describe, expect, it } from 'vitest';

import { createTestApp } from './testkit.ts';

/**
 * What is left of the public HTTP surface while the API has no way in.
 *
 * `issues/011-amputate-old-auth.md` deleted the hand-rolled session system, so
 * every case in this file that obtained an authenticated athlete went with it —
 * the error envelope, the removed-endpoint pins, the training reads, the day-log
 * validation and the workflow trigger. They are not adapted, they are restored
 * against bearer tokens by
 * `issues/012-token-verification-and-provisioning.md`, whose *Restored test
 * coverage* section carries the full inventory.
 *
 * What stays is what never knew who was asking: liveness, the guard's blanket
 * rejection, and the analytics proxy.
 */

describe('health', () => {
  it('GET /health is unauthenticated', async () => {
    const app = createTestApp();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('the guard', () => {
  // The one case that survives the amputation without adaptation, because it
  // never needed a session to begin with. It is also the only coverage the stub
  // guard has, and the stub is the new code in this commit: issue 012 widens
  // this to "a malformed or expired token is indistinguishable from a missing
  // one", which is not expressible until there are tokens.
  it('rejects /api/* with no credentials, inside the error envelope', async () => {
    const app = createTestApp();
    const res = await app.request('/api/me/profile');

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: 'unauthorized', message: 'sign in required' },
    });
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

  // Restated for the Authorization header rather than deleted. It used to mint a
  // real cookie to prove the point; the proxy strips both headers by name and
  // never looked at the value, so a synthetic token pins the same guarantee, and
  // it pins it for the transport the API is moving to.
  it('never forwards the caller credentials upstream', async () => {
    const { fetcher, forwarded } = stubFetch();
    const app = createTestApp({ ingestFetch: fetcher });

    await app.request('/ingest/i/v0/e/', {
      method: 'POST',
      headers: {
        authorization: 'Bearer not-a-real-token',
        cookie: 'session=stale',
        'content-type': 'text/plain',
      },
      body: '{}',
    });

    const upstream = forwarded();
    expect(upstream.headers.get('authorization')).toBeNull();
    expect(upstream.headers.get('cookie')).toBeNull();
    expect(upstream.headers.get('content-type')).toBe('text/plain');
  });

  it('is reachable with no credentials at all', async () => {
    const { fetcher } = stubFetch();
    const res = await createTestApp({ ingestFetch: fetcher }).request('/ingest/i/v0/e/', {
      method: 'POST',
      body: '{}',
    });
    expect(res.status).toBe(200);
  });
});
