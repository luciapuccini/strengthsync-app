import { eq } from 'drizzle-orm';

import type { Client } from '../../domain/model/index.ts';

import { nowIso } from '../dates.ts';
import type { Db } from '../db.ts';
import { RepoError } from '../errors.ts';
import { clients, coaches } from '../schema.ts';

/**
 * The `Client` the API returns, column by column. The projection is deliberate,
 * not stylistic: `clients.invite_code` holds a shared per-batch secret, and a
 * `select()` over the table would carry it into the sign-up, sign-in and
 * session responses, where one invitee could read it and pass it on. Same
 * reasoning that keeps the password hash in its own table.
 */
const clientColumns = {
  id: clients.id,
  coach_id: clients.coach_id,
  display_name: clients.display_name,
  status: clients.status,
  created_at: clients.created_at,
  updated_at: clients.updated_at,
};

// There is deliberately no `listClients`: it went with the route that used it
// in `issues/auth/013`. Reading every client is not something this application
// does — an athlete sees their own data, addressed by their session.
export async function getClient(db: Db, clientId: string): Promise<Client | null> {
  const rows = await db
    .select(clientColumns)
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Create a client under the MVP's single shared coach. The coach row comes
 * from `seeds/000_default_coach.sql` (see docs/in_progress checkpoints).
 *
 * `invite_code` is the code the account registered with (`docs/mvp.md` §2),
 * persisted for cohort attribution and read back only by SQL. It is optional so
 * that callers with no gate in front of them — the tests below the HTTP
 * boundary — stay unchanged; the sign-up handler always passes the code it just
 * accepted.
 */
export async function createClient(
  db: Db,
  input: Pick<Client, 'display_name'> & { invite_code?: string },
): Promise<Client> {
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
  await db.insert(clients).values({ ...client, invite_code: input.invite_code ?? null });
  return client;
}
