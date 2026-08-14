import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createApp } from '../src/app.ts';
import type { Db } from '../src/db/index.ts';

/**
 * Writes `server/openapi.json` from the route definitions.
 *
 * Handlers never run here — only the `createRoute()` definitions are read — so
 * a stub Db is enough. `db/index.ts` has no import-time side effects
 * (better-sqlite3 lives under db/testing/, which is not on this path).
 *
 * Run with `node --experimental-strip-types` (.nvmrc pins 22.14.0, which needs
 * the flag). The repo is strip-safe: erasableSyntaxOnly is on and relative
 * imports carry explicit .ts extensions.
 */

const app = createApp({ db: {} as Db, sessionSecret: '', inviteCode: '' });

const document = app.getOpenAPI31Document({
  openapi: '3.1.0',
  info: {
    title: 'StrengthSync Public API',
    version: '0.0.0',
    description:
      'Public HTTP boundary for the StrengthSync client/server monolith. Generated from the server route definitions by `pnpm gen:openapi` — do not edit by hand.',
  },
  servers: [{ url: '/', description: 'Cloudflare Workers origin' }],
  security: [{ sessionCookie: [] }],
});

// The security scheme is referenced by `security` above but has to be
// registered as a component for the reference to resolve. Routes reachable
// without a session declare `security: []` and opt out of this default.
document.components = {
  ...document.components,
  securitySchemes: {
    ...document.components?.securitySchemes,
    sessionCookie: { type: 'apiKey', in: 'cookie', name: 'session' },
  },
};

const out = resolve(import.meta.dirname, '../openapi.json');
writeFileSync(out, `${JSON.stringify(document, null, 2)}\n`);
console.log(`wrote ${out}`);
