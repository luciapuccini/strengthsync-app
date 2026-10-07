import { Hono } from 'hono';

const CAPTURE_ORIGIN = 'https://us.i.posthog.com';
const ASSETS_ORIGIN = 'https://us-assets.i.posthog.com';

const PREFIX = '/ingest';
const ASSETS_PREFIX = `${PREFIX}/static/`;

export function ingestRoutes(fetcher: typeof fetch = fetch): Hono {
  const app = new Hono();

  app.all(`${PREFIX}/*`, async (c) => {
    const url = new URL(c.req.url);
    const origin = url.pathname.startsWith(ASSETS_PREFIX) ? ASSETS_ORIGIN : CAPTURE_ORIGIN;
    const upstream = new URL(url.pathname.slice(PREFIX.length) + url.search, origin);

    const headers = new Headers(c.req.raw.headers);
    headers.delete('cookie');
    headers.delete('authorization');
    headers.delete('host');

    const hasBody = c.req.method !== 'GET' && c.req.method !== 'HEAD';

    return fetcher(upstream, {
      method: c.req.method,
      headers,
      body: hasBody ? await c.req.raw.arrayBuffer() : null,
    });
  });

  return app;
}
