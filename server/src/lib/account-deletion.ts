import {
  deleteClient,
  deleteIdentity,
  deletePlans,
  deleteProfile,
  deleteWeeks,
  findSubjectByClientId,
  type Db,
} from '../db/index.ts';

import type { ManagementClient } from './management.ts';

/**
 * Delete an athlete's identity and everything they have trained.
 * See docs/architecture/auth.md and `issues/014-account-deletion.md`.
 *
 * App Store Guideline 5.1.1(v) requires an app that creates accounts to let
 * someone delete one from inside it, and requires deletion rather than
 * deactivation — so `CLIENT_STATUSES`' `archived` does not satisfy it.
 *
 * The order below is this module's entire reason for existing, which is why it
 * is a module and not six lines in a route handler. Nothing here branches, and
 * a handler that inlined it would read as a plausible sequence with no record of
 * why it is that sequence and not another.
 *
 * ## What the order is chosen against
 *
 * Not data loss. **Resurrection.**
 *
 * `resolveClientId` provisions unconditionally on a subject it has not seen —
 * sign-ups are disabled at the tenant, so every subject reaching the guard was
 * created by the operator on purpose and there is no eligibility check left to
 * fail. That is correct for onboarding and it is exactly what makes this order
 * load-bearing.
 *
 * If the identity row went while the Auth0 user survived, the next request
 * carrying that athlete's still-live token would not error. The subject would be
 * unknown locally, the Management API would confirm the user, and the guard
 * would create them again: new athlete id, empty account, no profile, no
 * history, nothing logged anywhere. The deletion would silently reverse itself
 * into something that looks like the app erased their training and left them
 * signed in.
 *
 * Every other failure here leaves rows lying around, which is untidy. That one
 * produces a wrong answer that looks like a working system. The order spends the
 * tolerable failure to buy out the intolerable one.
 *
 * ## Why the identity row goes second and not last
 *
 * Because deleting the Auth0 user does **not** lock anybody out on its own, and
 * the obvious reading — "they are already locked out once the provider user is
 * gone" — is wrong. `resolveClientId` short-circuits on a subject it has already
 * mapped and never consults Auth0 again, so an access token minted a minute
 * earlier keeps working against whatever local rows remain, for the rest of its
 * lifetime. Deleting the provider user only stops a *new* token being minted.
 *
 * With the identity row deleted last, that window spans the whole cascade: an
 * athlete can be reading a half-erased account — plans gone, profile still there
 * — while it runs, or indefinitely if it wedges part-way. Deleting it
 * immediately after the provider shrinks the window to the gap between two
 * adjacent statements, after which every request from that token resolves
 * nothing locally, finds no user at the provider, and is refused exactly like a
 * stranger's.
 *
 * Both orders are safe from resurrection. Only one closes the window in
 * milliseconds.
 *
 * ## Accepted trade-off
 *
 * There is no transaction spanning Auth0 and D1, and none spanning D1's own
 * statements, so a failure anywhere in the cascade leaves weeks, plans, a
 * profile or a `clients` row with no identity pointing at them. They are
 * unreachable by construction — every request arrives as a subject, and that
 * subject maps to nothing — so nothing can read them and nothing grows from
 * them. At twenty athletes that is a manual sweep, not a system; the version
 * that is correct under partial failure needs a marker write plus a scheduled
 * retrying purge, which the parent PRD puts out of scope and
 * `docs/future_state_after_mvp/todos.md` records.
 *
 * ## Not covered by the suite
 *
 * Deliberately, and recorded in the PRD: what this module gets right is a
 * decision about failure behaviour, and nothing fails if a future change inverts
 * it — a test would pin the order without preserving the reason, which is the
 * part worth keeping. The reason is written above instead, and the endpoint is
 * run once against the real tenant before store submission.
 */
export async function deleteAccount(
  db: Db,
  management: ManagementClient,
  clientId: string,
): Promise<void> {
  const subject = await findSubjectByClientId(db, clientId);

  // 1. The provider first, and the only clean abort in the sequence: if this
  //    throws, nothing local has been touched, the athlete keeps a working
  //    account and the request can simply be retried.
  //
  //    A missing identity row means the provider half already succeeded on an
  //    earlier attempt that died before step 2 — the athlete is unreachable
  //    either way, so there is nobody left to name at Auth0 and the cascade is
  //    what remains to finish. `deleteUser` treats an already-gone user as
  //    success for the same reason.
  if (subject) await management.deleteUser(subject);

  // 2. Immediately after, and before any training data. This is the statement
  //    that actually ends the athlete's access — see the argument above.
  await deleteIdentity(db, clientId);

  // 3. Then the training data, in the order the foreign keys force: a week
  //    references a plan and an athlete, a plan and a profile reference an
  //    athlete, and the athlete row goes last because everything referenced it.
  await deleteWeeks(db, clientId);
  await deletePlans(db, clientId);
  await deleteProfile(db, clientId);
  await deleteClient(db, clientId);
}
