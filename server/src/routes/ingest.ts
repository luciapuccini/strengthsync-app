import { Hono } from 'hono';

/**
 * PostHog's US ingestion endpoint, and the CDN `posthog-js` lazily pulls its
 * optional bundles from. Both hostnames sit on every mainstream tracker
 * blocklist, which is the entire reason this proxy exists.
 */
const CAPTURE_ORIGIN = 'https://us.i.posthog.com';
const ASSETS_ORIGIN = 'https://us-assets.i.posthog.com';

const PREFIX = '/ingest';
const ASSETS_PREFIX = `${PREFIX}/static/`;

/**
 * First-party reverse proxy for PostHog, mirroring the marketing site's
 * `/ingest` rewrite (`next.config.mjs`). `posthog-js` is configured with
 * `api_host: '/ingest'`, so a capture leaves the browser as a same-origin
 * request to app.strengthsync.ai and no blocklist ever sees a posthog.com host.
 *
 * The Worker has to claim `/ingest/*` in `run_worker_first` (wrangler.jsonc) or
 * the asset handler answers first, and `single-page-application` turns every
 * capture into a 200 carrying index.html — which `posthog-js` reads as success,
 * so the events vanish without a single error in the console.
 *
 * The two upstream origins are fixed constants: nothing in the request chooses
 * where this forwards, so the route cannot be driven as a general open proxy.
 */
export function ingestRoutes(fetcher: typeof fetch = fetch): Hono {
  const app = new Hono();

  app.all(`${PREFIX}/*`, async (c) => {
    const url = new URL(c.req.url);
    const origin = url.pathname.startsWith(ASSETS_PREFIX) ? ASSETS_ORIGIN : CAPTURE_ORIGIN;
    const upstream = new URL(url.pathname.slice(PREFIX.length) + url.search, origin);

    const headers = new Headers(c.req.raw.headers);
    // Same-origin is the point of this route, and its one hazard: the browser
    // attaches whatever speaks for the athlete to every capture. PostHog neither
    // needs a credential nor should ever hold one. Both headers go by name, so
    // this kept working unchanged when the transport moved from the cookie to a
    // bearer token.
    headers.delete('cookie');
    headers.delete('authorization');
    // Belongs to app.strengthsync.ai; the upstream host comes from `upstream`.
    headers.delete('host');

    // Buffered rather than streamed: capture payloads are a few KB, and a
    // stream body would need `duplex: 'half'`. Buffering copies the bytes
    // verbatim, so a gzip body still matches the content-encoding it declares.
    const hasBody = c.req.method !== 'GET' && c.req.method !== 'HEAD';

    return fetcher(upstream, {
      method: c.req.method,
      headers,
      // null, not undefined: `exactOptionalPropertyTypes` is on, and RequestInit
      // spells "no body" as null.
      body: hasBody ? await c.req.raw.arrayBuffer() : null,
    });
  });

  return app;
}
