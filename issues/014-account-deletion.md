# 014 — Account deletion

## Parent PRD

`issues/auth0-migration/prd.md`

## What to build

An authenticated endpoint that deletes the athlete's identity and their training
data, and the control in the app that calls it. App Store Guideline 5.1.1(v)
requires an app that creates accounts to let a user delete one from inside the
app, and the API has no such endpoint today — this is the one store requirement
the current design cannot satisfy at all.

**Order matters, and the order is the module's entire value.** There is no
transaction spanning Auth0 and D1, and none spanning D1's own statements, so
every step of this can fail with the previous ones already done. The order is
chosen so that whichever step fails, the result is recoverable rather than wrong.

### What is actually being designed against

Not data loss. **Resurrection.**

`resolveClientId` in `server/src/lib/identity.ts` provisions unconditionally on a
subject it has not seen. There is no eligibility check left to fail — sign-ups
are disabled at the tenant, so any subject reaching the guard was created by the
operator on purpose. That is correct for onboarding and it is exactly what makes
deletion order load-bearing.

If the local `client_identities` row is deleted while the Auth0 user still
exists, the next request carrying that athlete's still-live token does not
error. The subject is unknown locally, the Management API confirms the user, and
the guard **creates them again** — a new athlete id, an empty account, no
profile, no history. The deletion silently reverses itself, and nothing anywhere
logs a problem. To the athlete it looks as though the app erased their training
history and left them signed in.

That is the failure this ordering exists to make impossible. Every other failure
here leaves rows lying around, which is untidy; this one produces a wrong answer
that looks like a working system.

### The order

1. **Delete the Auth0 user** (`deleteUser` on the Management client). If this
   fails, stop and delete nothing locally. The athlete keeps a working account
   and the request can be retried — the one clean abort in the sequence.
2. **Delete the `client_identities` row.** Immediately after step 1 and before
   any training data, for the reason in the next section.
3. **Then the training data, in foreign-key order:** weeks (which reference
   `plans`), then plans, then the profile, then the `clients` row itself.

### Why the identity row goes second and not second-to-last

An earlier draft of this issue put the identity delete near the end of the
cascade, on the reasoning that the athlete is "already locked out" once the Auth0
user is gone. **That reasoning is wrong**, and the mistake is worth keeping
written down because it is not obvious.

`resolveClientId` short-circuits:

```ts
const known = await findClientIdBySubject(db, subject);
if (known) return known;   // the Management API is never consulted
```

A subject that is already mapped locally never touches Auth0 again. So deleting
the Auth0 user does **not** lock anybody out — it only stops them minting a
*new* token. An access token issued five minutes earlier keeps working, against
whatever local rows still exist, for the rest of its lifetime.

With the identity delete last, that window spans the entire cascade: an athlete
can be reading a half-deleted account — plans gone, profile still there — while
the deletion is in flight or wedged part-way. With the identity delete second,
the window is the gap between two adjacent statements, and after it every request
from that token resolves nothing locally, finds no user at the provider, and gets
the same 401 as a stranger.

So both orders are safe from resurrection. Only one of them closes the window in
milliseconds instead of leaving it open for as long as the cascade takes, or
forever if the cascade dies in the middle.

### Accepted trade-off

Rows can outlive a deletion request: a failure anywhere in step 3 leaves weeks,
plans, a profile or a `clients` row with no identity pointing at them. They are
unreachable by construction — every request arrives as a subject, and that
subject no longer maps to anything — so nothing can read them and nothing will
grow from them. At twenty athletes that is a manual sweep, not a system.

The version that is correct under partial failure needs a marker write plus a
scheduled retrying purge, which the PRD puts out of scope. Record the gap in
`docs/future_state_after_mvp/todos.md` rather than closing it here.

Note the asymmetry that makes this acceptable: leftover rows are recoverable and
invisible, whereas a resurrected account is neither. The ordering above spends
the tolerable failure to buy out the intolerable one.

Archiving does not satisfy the guideline, which is explicit that deletion must
not be deactivation.

HITL: the PRD deliberately leaves this module untested, on the grounds that its
ordering is a decision about failure behaviour rather than something a test
would catch. That makes one manual run against the real tenant the only
verification there is, so it is not optional.

## Acceptance criteria

- [ ] An authenticated endpoint deletes the provider user first, then the
      identity row, then cascades weeks, plans, profile and the athlete row
- [ ] A failed Auth0 deletion deletes nothing locally and leaves a working
      account
- [ ] The ordering rationale is written in the module, not in a route handler —
      including why the identity row goes second rather than last
- [ ] A destructive control exists in the app behind an explicit confirmation
      that says the data is not recoverable
- [ ] Deleting an account, then attempting to sign in with the same credentials,
      fails at the provider
- [ ] Run once against the real tenant: the Auth0 user is gone and no row for
      that athlete remains in any of the five tables
- [ ] After that run, the athlete's still-live access token is presented to
      `GET /api/me` and answers 401 — **not** 200 with a new empty account,
      which is what a wrong ordering produces and what no other check catches
- [ ] The partial-failure trade-off is recorded in
      `docs/future_state_after_mvp/todos.md`, not fixed here

## Blocked by

- Blocked by `issues/013-web-app-universal-login.md`

## User stories addressed

- User stories 10, 11, 41

## STATUS

TODO
