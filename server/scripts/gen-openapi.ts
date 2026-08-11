import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createApp } from '../src/app.ts'
import type { Db } from '../src/db/index.ts'

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

const app = createApp({
  db: {} as Db,
  basicAuth: { username: '', password: '' },
})

const document = app.getOpenAPI31Document({
  openapi: '3.1.0',
  info: {
    title: 'StrengthSync Public API',
    version: '0.0.0',
    description:
      'Public HTTP boundary for the StrengthSync client/server monolith. Generated from the server route definitions by `pnpm gen:openapi` — do not edit by hand.',
  },
  servers: [{ url: '/', description: 'Cloudflare Workers origin' }],
  security: [{ basicAuth: [] }],
})

// The security scheme is referenced by `security` above but has to be
// registered as a component for the reference to resolve.
document.components = {
  ...document.components,
  securitySchemes: {
    ...document.components?.securitySchemes,
    basicAuth: { type: 'http', scheme: 'basic' },
  },
}

// Optional output path so `check:openapi` can regenerate into a scratch file
// and diff, rather than mutating the committed one.
const out = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(import.meta.dirname, '../openapi.json')
writeFileSync(out, `${JSON.stringify(document, null, 2)}\n`)
console.log(`wrote ${out}`)
