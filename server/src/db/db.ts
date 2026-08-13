import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';

import * as schema from './schema.ts';

/** Repository database handle: drizzle's D1 driver over the five tables. */
export type Db = DrizzleD1Database<typeof schema>;

/**
 * Create a `Db` from a D1 binding. The parameter is structurally typed so
 * this package never needs the Workers runtime types; `server` passes its
 * `env.DB` binding and tests pass the fake D1 from `./testing`.
 */
export function createDb(client: Parameters<typeof drizzle>[0]): Db {
  return drizzle(client, { schema });
}
