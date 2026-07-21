import { eq } from 'drizzle-orm'

import type { UpdateClientProfile } from '@strengthsync/domain/contracts'
import type { ClientProfile } from '@strengthsync/domain/model'

import { nowIso, todayIso } from '../dates.ts'
import type { Db } from '../db.ts'
import { newId } from '../ids.ts'
import { clientProfiles } from '../schema.ts'

export async function getProfile(db: Db, clientId: string): Promise<ClientProfile | null> {
  const rows = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.client_id, clientId))
    .limit(1)
  return rows[0] ?? null
}

/** One current profile per client: insert or update on the client_id unique key. */
export async function upsertProfile(
  db: Db,
  clientId: string,
  update: UpdateClientProfile,
): Promise<ClientProfile> {
  const now = nowIso()
  const snapshotDate = update.snapshot_date ?? todayIso()
  const rows = await db
    .insert(clientProfiles)
    .values({
      id: newId(),
      client_id: clientId,
      ...update,
      snapshot_date: snapshotDate,
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: clientProfiles.client_id,
      set: { ...update, snapshot_date: snapshotDate, updated_at: now },
    })
    .returning()
  const row = rows[0]
  if (!row) {
    throw new Error('upsertProfile: expected one returned row')
  }
  return row
}
