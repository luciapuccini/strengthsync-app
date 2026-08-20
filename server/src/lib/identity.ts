import {
  claimSubject,
  createClient,
  deleteUnboundClient,
  findClientIdBySubject,
  type Db,
} from '../db/index.ts';

import type { ManagementClient } from './management.ts';

/**
 * A verified subject in, an internal athlete id out. See docs/architecture/auth.md.
 *
 * The guard's back half, and the only part of this migration with real
 * branching. It hides the lookup, the first-request profile fetch, the two-row
 * insert, and the race between two first requests arriving together.
 *
 * Provisioning is lazy and unconditional. There is no eligibility check left to
 * make: sign-ups are disabled at the tenant, so every subject that reaches here
 * belongs to somebody the operator created by hand. The invite code that used to
 * answer this question was deleted with the rest of the old system in
 * `issues/011-amputate-old-auth.md`, and nothing replaced it because nothing
 * needs to.
 *
 * Returns null when the provider has no user for a subject it signed a token
 * for. That is not a contradiction — a token outlives the account it names, so
 * this is what a request from an athlete deleted mid-session looks like.
 */
export async function resolveClientId(
  db: Db,
  management: ManagementClient,
  subject: string,
): Promise<string | null> {
  const known = await findClientIdBySubject(db, subject);
  if (known) return known;

  const user = await management.getUser(subject);
  if (!user) return null;

  // The athlete row has to exist before the identity row can point at it, so
  // this is the order the foreign key forces. It also means this request is now
  // holding a row it may not get to keep.
  const client = await createClient(db, { display_name: user.name });
  const { client_id, claimed } = await claimSubject(db, {
    client_id: client.id,
    subject,
    email: user.email,
  });

  if (!claimed) {
    // Another request provisioned this same person while this one was talking to
    // the Management API. The subject's unique constraint decided between them,
    // and this one lost — so it takes back the athlete it just created and
    // returns the winner's.
    //
    // Without this the constraint still prevents two identities, which is what
    // makes the race *safe*; what it does not prevent is a second athlete row
    // that no identity points at. Those are invisible — unreachable by any
    // request, since every request arrives as a subject — so they would
    // accumulate silently rather than fail.
    await deleteUnboundClient(db, client.id);
  }
  return client_id;
}
