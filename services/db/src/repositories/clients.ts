import { eq } from 'drizzle-orm'

import type { CreateClientInput } from '@strengthsync/domain/contracts'
import type { Client } from '@strengthsync/domain/model'

import { nowIso } from '../dates.ts'
import type { Db } from '../db.ts'
import { RepoError } from '../errors.ts'
import { newId } from '../ids.ts'
import { clients, coaches } from '../schema.ts'

export async function listClients(db: Db): Promise<Client[]> {
  return db.select().from(clients).orderBy(clients.created_at)
}

export async function getClient(db: Db, clientId: string): Promise<Client | null> {
  const rows = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1)
  return rows[0] ?? null
}

/**
 * Create a client under the MVP's single shared coach. The coach row comes
 * from `seeds/000_default_coach.sql` (see docs/in_progress checkpoints).
 */
export async function createClient(db: Db, input: CreateClientInput): Promise<Client> {
  const coach = (await db.select().from(coaches).limit(1))[0]
  if (!coach) {
    throw new RepoError(
      'conflict',
      'coach_not_seeded',
      'no coach row exists; apply seeds/000_default_coach.sql',
    )
  }
  const now = nowIso()
  const client: Client = {
    id: newId(),
    coach_id: coach.id,
    display_name: input.display_name,
    status: 'active',
    created_at: now,
    updated_at: now,
  }
  await db.insert(clients).values(client)
  return client
}
