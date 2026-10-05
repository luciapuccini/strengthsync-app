import { eq } from 'drizzle-orm';

import type { Client, UnitPreference } from '../../domain/model/index.ts';

import { nowIso } from '../dates.ts';
import type { Db } from '../db.ts';
import { RepoError } from '../errors.ts';
import { clients, coaches } from '../schema.ts';

const clientColumns = {
  id: clients.id,
  coach_id: clients.coach_id,
  display_name: clients.display_name,
  status: clients.status,
  unit_preference: clients.unit_preference,
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
    unit_preference: 'imperial',
    created_at: now,
    updated_at: now,
  };
  await db.insert(clients).values(client);
  return client;
}

export async function updateUnitPreference(
  db: Db,
  clientId: string,
  preference: UnitPreference,
): Promise<Client | null> {
  const rows = await db
    .update(clients)
    .set({ unit_preference: preference, updated_at: nowIso() })
    .where(eq(clients.id, clientId))
    .returning(clientColumns);
  return rows[0] ?? null;
}

export async function deleteClient(db: Db, clientId: string): Promise<void> {
  await db.delete(clients).where(eq(clients.id, clientId));
}
