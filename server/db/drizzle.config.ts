import { defineConfig } from 'drizzle-kit';

// Paths resolve against the CWD of the `db:generate` script (server/), not against
// this file's directory. `out` must stay in step with wrangler.jsonc's migrations_dir.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './db/drizzle',
});
