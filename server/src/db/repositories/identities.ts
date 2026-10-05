import { eq } from 'drizzle-orm';

import { nowIso } from '../dates.ts';
import type { Db } from '../db.ts';
import { clientIdentities, clients } from '../schema.ts';

export async function findClientIdBySubject(db: Db, subject: string): Promise<string | null> {
  const rows = await db
    .select({ client_id: clientIdentities.client_id })
    .from(clientIdentities)
    .where(eq(clientIdentities.subject, subject))
    .limit(1);
  return rows[0]?.client_id ?? null;
}

export async function claimSubject(
  db: Db,
  input: { client_id: string; subject: string; email: string },
): Promise<{ client_id: string; claimed: boolean }> {
  const now = nowIso();
  await db
    .insert(clientIdentities)
    .values({ ...input, created_at: now, updated_at: now })
    .onConflictDoNothing();

  const winner = await findClientIdBySubject(db, input.subject);
  if (!winner) {
    throw new Error(`subject ${input.subject} vanished between claim and read`);
  }
  return { client_id: winner, claimed: winner === input.client_id };
}

export async function deleteUnboundClient(db: Db, clientId: string): Promise<void> {
  await db.delete(clients).where(eq(clients.id, clientId));
}

export async function findSubjectByClientId(db: Db, clientId: string): Promise<string | null> {
  const rows = await db
    .select({ subject: clientIdentities.subject })
    .from(clientIdentities)
    .where(eq(clientIdentities.client_id, clientId))
    .limit(1);
  return rows[0]?.subject ?? null;
}

export async function deleteIdentity(db: Db, clientId: string): Promise<void> {
  await db.delete(clientIdentities).where(eq(clientIdentities.client_id, clientId));
}
