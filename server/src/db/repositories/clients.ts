import { eq } from 'drizzle-orm';

import type { Client } from '../../domain/model/index.ts';

import { nowIso } from '../dates.ts';
import type { Db } from '../db.ts';
import { RepoError } from '../errors.ts';
import { clients, coaches } from '../schema.ts';

// There is deliberately no `listClients`: it went with the route that used it
// in `issues/auth/013`. Reading every client is not something this application
// does — an athlete sees their own data, addressed by their session.
export async function getClient(db: Db, clientId: string): Promise<Client | null> {
  const rows = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  return rows[0] ?? null;
}

/**
 * Create a client under the MVP's single shared coach. The coach row comes
 * from `seeds/000_default_coach.sql` (see docs/in_progress checkpoints).
 */
export async function createClient(db: Db, input: Pick<Client, 'display_name'>): Promise<Client> {
  const coach = (await db.select().from(coaches).limit(1))[0];
  if (!coach) {
    throw new RepoError(
      'conflict',
      'coach_not_seeded',
      'no coach row exists; apply seeds/000_default_coach.sql',
    );
  }
  const now = nowIso();
  const client: Client = {
    id: crypto.randomUUID(),
    coach_id: coach.id,
    display_name: input.display_name,
    status: 'active',
    created_at: now,
    updated_at: now,
  };
  await db.insert(clients).values(client);
  return client;
}
