import { eq } from "drizzle-orm";

import type { UpdateClientProfile } from "../../domain/contracts/index.ts";
import type { ClientProfile } from "../../domain/model/index.ts";

import { nowIso, todayIso } from "../dates.ts";
import type { Db } from "../db.ts";
import { clientProfiles } from "../schema.ts";

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
  update: UpdateClientProfile,
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
