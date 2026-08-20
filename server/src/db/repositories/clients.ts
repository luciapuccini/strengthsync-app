import { eq } from 'drizzle-orm';

import type { Client } from '../../domain/model/index.ts';

import { nowIso } from '../dates.ts';
import type { Db } from '../db.ts';
import { RepoError } from '../errors.ts';
import { clients, coaches } from '../schema.ts';

/**
 * The `Client` the API returns, column by column. Identity now lives
 * in its own table.
 */
const clientColumns = {
  id: clients.id,
  coach_id: clients.coach_id,
  display_name: clients.display_name,
  status: clients.status,
  created_at: clients.created_at,
  updated_at: clients.updated_at,
};

export async function getClient(db: Db, clientId: string): Promise<Client | null> {
  const rows = await db
    .select(clientColumns)
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Create a client under the MVP's single shared coach.
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

/**
 * Remove the athlete row itself. The last statement of account deletion.
 *
 * Distinct from `deleteUnboundClient` in `identities.ts`, which looks identical
 * and is not the same operation: that one takes back a row the calling request
 * created moments earlier and that nothing has ever referenced. This one removes
 * an athlete who has lived, so it is only safe once their identity, weeks, plans
 * and profile are already gone — every one of those has a foreign key onto this
 * row. The ordering that guarantees it lives in `lib/account-deletion.ts`.
 */
export async function deleteClient(db: Db, clientId: string): Promise<void> {
  await db.delete(clients).where(eq(clients.id, clientId));
}
