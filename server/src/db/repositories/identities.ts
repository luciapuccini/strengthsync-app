import { eq } from 'drizzle-orm';

import { nowIso } from '../dates.ts';
import type { Db } from '../db.ts';
import { clientIdentities, clients } from '../schema.ts';

/**
 * The provider subject ↔ internal athlete mapping. See docs/architecture/auth.md.
 *
 * Nothing here is reachable from a route. The only caller is `resolveClientId`
 * in `lib/identity.ts`, which is the guard's back half — routes receive an
 * athlete id and never learn the subject that produced it.
 */

/** The internal athlete this subject belongs to, or null if it is unknown. */
export async function findClientIdBySubject(db: Db, subject: string): Promise<string | null> {
  const rows = await db
    .select({ client_id: clientIdentities.client_id })
    .from(clientIdentities)
    .where(eq(clientIdentities.subject, subject))
    .limit(1);
  return rows[0]?.client_id ?? null;
}

/**
 * Bind a subject to an athlete, and report whether this caller is the one that
 * managed it.
 *
 * `onConflictDoNothing` rather than catching a thrown constraint error, because
 * the alternative is matching on a message string: SQLite says
 * `UNIQUE constraint failed: client_identities.subject` and D1 wraps that in its
 * own prefix and suffix. A conditional insert asks the database the same
 * question in a form that has no wording to drift.
 *
 * The return value is read back rather than inferred from a row count. That is
 * what makes the answer true for the *loser* of the race as well: it learns not
 * only that it lost but which athlete won, which is exactly what it has to
 * return to its own caller.
 */
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
  // The row cannot be missing: either this insert placed it or another request
  // did. A null here means the subject was deleted between the two statements,
  // which nothing in the system does.
  if (!winner) {
    throw new Error(`subject ${input.subject} vanished between claim and read`);
  }
  return { client_id: winner, claimed: winner === input.client_id };
}

/**
 * Remove an athlete row that was created but never bound to a subject.
 *
 * Provisioning has to insert the athlete before the identity, because
 * `client_identities.client_id` is a foreign key onto it. When two first
 * requests for the same person race, both insert an athlete and only one binds
 * it — so the loser has to take its own row back out. D1 has no transaction to
 * make that unnecessary.
 *
 * Narrow on purpose. It deletes one row, from one table, and only ever the row
 * the calling request itself just created moments earlier, which is why it needs
 * no cascade: nothing can reference an athlete that has not been reachable by
 * any request. Deleting an athlete who has *lived* is a different operation with
 * a different shape, and belongs to
 * `issues/014-account-deletion.md`.
 */
export async function deleteUnboundClient(db: Db, clientId: string): Promise<void> {
  await db.delete(clients).where(eq(clients.id, clientId));
}

/**
 * The subject an athlete authenticates as, or null if they have no identity row.
 *
 * The one read that runs the mapping backwards. Every other caller arrives
 * holding a subject and wants an athlete; account deletion arrives holding an
 * athlete — because that is all the guard puts on the context — and has to name
 * them at the provider.
 *
 * That direction is deliberately not exposed to routes. Its only caller is
 * `deleteAccount` in `lib/account-deletion.ts`, which keeps the subject inside
 * the module for the length of one Management API call and never returns it.
 */
export async function findSubjectByClientId(db: Db, clientId: string): Promise<string | null> {
  const rows = await db
    .select({ subject: clientIdentities.subject })
    .from(clientIdentities)
    .where(eq(clientIdentities.client_id, clientId))
    .limit(1);
  return rows[0]?.subject ?? null;
}

/**
 * Unbind an athlete from their provider identity.
 *
 * Step two of account deletion, and the step that closes the resurrection
 * window — see `lib/account-deletion.ts` for why it runs there and not at the
 * end of the cascade. After this the athlete's still-live access token resolves
 * to nothing locally, and `resolveClientId` finds no user at the provider to
 * re-provision from, so it is refused like any stranger's.
 */
export async function deleteIdentity(db: Db, clientId: string): Promise<void> {
  await db.delete(clientIdentities).where(eq(clientIdentities.client_id, clientId));
}
