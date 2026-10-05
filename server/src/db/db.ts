import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';

import * as schema from './schema.ts';

export type Db = DrizzleD1Database<typeof schema>;

export function createDb(client: Parameters<typeof drizzle>[0]): Db {
  return drizzle(client, { schema });
}
