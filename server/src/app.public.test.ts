import { describe, expect, it } from 'vitest';

import { createTestApp } from './testkit.ts';

describe('health', () => {
  it('GET /health is unauthenticated', async () => {
    const app = createTestApp();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('/ingest', () => {
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

  it('forwards /ingest/static to the assets host', async () => {
    const { fetcher, forwarded } = stubFetch();
    const app = createTestApp({ ingestFetch: fetcher });

    await app.request('/ingest/static/array.js');

    expect(forwarded().url).toBe('https://us-assets.i.posthog.com/static/array.js');
  });

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
