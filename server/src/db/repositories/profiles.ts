import { eq } from "drizzle-orm";

import type {
  ClientProfile,
  ClientProfileWrite,
} from "../../domain/model/index.ts";

import { nowIso, todayIso } from "../dates.ts";
import type { Db } from "../db.ts";
import { clientProfiles } from "../schema.ts";

/**
 * A client's profile, or null when they have none.
 *
 * `getProfile` below throws instead, which the workflow relies on but which
 * makes `GET /api/clients/{clientId}/profile` answer 500 where it declares 404
 * — a client with no profile yet is ordinary, not exceptional. That route is
 * left alone (`issues/auth/010` is not to touch it, `013` deletes it); the /me
 * route that replaces it uses this.
 */
export async function findProfile(
  db: Db,
  clientId: string,
): Promise<ClientProfile | null> {
  const rows = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.client_id, clientId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProfile(
  db: Db,
  clientId: string,
): Promise<ClientProfile> {
  const rows = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.client_id, clientId))
    .limit(1);
  if (!rows[0]) {
    throw new Error("No profile found for client");
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
    throw new Error("upsertProfile: expected one returned row");
  }
  return row;
}
