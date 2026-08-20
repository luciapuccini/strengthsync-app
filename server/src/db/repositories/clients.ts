import { eq } from 'drizzle-orm';

import type { Client } from '../../domain/model/index.ts';

import { nowIso } from '../dates.ts';
import type { Db } from '../db.ts';
import { RepoError } from '../errors.ts';
import { clients, coaches } from '../schema.ts';

/**
 * The `Client` the API returns, column by column. The projection outlived the
 * secret it was written for — `clients.invite_code` is gone with the invite gate
 * — but it is kept rather than replaced by `select()`, because it pins the
 * response to the domain `Client` shape: a column added to the table later
 * cannot reach the browser without someone naming it here. Identity now lives
 * in its own table for the same reason the password hash did.
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
// does — an athlete sees their own data, addressed by their verified token.
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
 * There is no eligibility argument left to pass. The cohort is created directly
 * at the identity provider with sign-ups disabled, so every caller that gets
 * this far was invited by construction — see docs/architecture/auth.md.
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
