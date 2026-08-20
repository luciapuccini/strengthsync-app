import { eq } from 'drizzle-orm';

import type { ClientProfile, ClientProfileWrite } from '../../domain/model/index.ts';

import { nowIso, todayIso } from '../dates.ts';
import type { Db } from '../db.ts';
import { clientProfiles } from '../schema.ts';

/** A client's profile, or null when they have none. What the routes use. */
export async function findProfile(db: Db, clientId: string): Promise<ClientProfile | null> {
  const rows = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.client_id, clientId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * A client's profile, or a thrown error. Workflow-only: it cannot build a plan
 * without one and has no caller to answer with a 404. No route uses this — one
 * did, and answered 500 where it declared 404, until `issues/auth/013` deleted
 * it.
 */
export async function getProfile(db: Db, clientId: string): Promise<ClientProfile> {
  const rows = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.client_id, clientId))
    .limit(1);
  if (!rows[0]) {
    throw new Error('No profile found for client');
  }
  return rows[0];
}

/** One current profile per client: insert or update on the client_id unique key. */
export async function upsertProfile(
  db: Db,
  clientId: string,
  update: ClientProfileWrite,
): Promise<ClientProfile> {
  const now = nowIso();
  const snapshotDate = update.snapshot_date ?? todayIso();
  const rows = await db
    .insert(clientProfiles)
    .values({
      id: crypto.randomUUID(),
      client_id: clientId,
      ...update,
      snapshot_date: snapshotDate,
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: clientProfiles.client_id,
      set: { ...update, snapshot_date: snapshotDate, updated_at: now },
    })
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error('upsertProfile: expected one returned row');
  }
  return row;
}

/**
 * Remove an athlete's profile. Step four of account deletion — after the plans
 * that were generated from it, before the athlete row it points at.
 */
export async function deleteProfile(db: Db, clientId: string): Promise<void> {
  await db.delete(clientProfiles).where(eq(clientProfiles.client_id, clientId));
}
