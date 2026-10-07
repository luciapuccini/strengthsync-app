import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createApp } from '../src/app.ts';
import type { Db } from '../src/db/index.ts';

const app = createApp({
  db: {} as Db,
  verifyToken: async () => null,
  management: { getUser: async () => null, deleteUser: async () => {} },
});

const document = app.getOpenAPI31Document({
  openapi: '3.1.0',
  info: {
    title: 'StrengthSync Public API',
    version: '0.0.0',
    description:
      'Public HTTP boundary for the StrengthSync client/server monolith. Generated from the server route definitions by `pnpm gen:openapi` — do not edit by hand.',
  },
  servers: [{ url: '/', description: 'Cloudflare Workers origin' }],
  security: [{ bearerAuth: [] }],
});

document.components = {
  ...document.components,
  securitySchemes: {
    ...document.components?.securitySchemes,
    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  },
};

const out = resolve(import.meta.dirname, '../openapi.json');
writeFileSync(out, `${JSON.stringify(document, null, 2)}\n`);
console.log(`wrote ${out}`);
