# 014 — Account deletion

## Parent PRD

`issues/auth0-migration/prd.md`

## What to build

An authenticated endpoint that deletes the athlete's identity and their training
data, and the control in the app that calls it. App Store Guideline 5.1.1(v)
requires an app that creates accounts to let a user delete one from inside the
app, and the API has no such endpoint today — this is the one store requirement
the current design cannot satisfy at all.

**Order matters, and the order is the module's entire value.** The provider's
user is deleted first, then the training data cascades in foreign-key order.
That order is chosen for its failure mode. If the cascade fails part-way the
athlete is already locked out — the identity is gone, so no token can ever be
minted again — and what remains is unreachable rows that can be swept by hand.
The reverse order fails worse: a failed identity deletion leaves someone who can
still sign in, and because provisioning is unconditional they would be handed a
fresh empty account, so a failed deletion would look like the app had silently
erased their training history.

Four tables reference the athlete, and `weeks` also references `plans`, so the
cascade runs weeks, then plans, then profile, then identity, then the athlete.

**Accepted trade-off:** rows can outlive a deletion request. At twenty athletes
that is a manual cleanup, not a system. The version that is correct under
partial failure needs a marker write plus a scheduled retrying purge job, which
is out of scope.

Archiving does not satisfy the guideline, which is explicit that deletion must
not be deactivation.

HITL: the PRD deliberately leaves this module untested, on the grounds that its
ordering is a decision about failure behaviour rather than something a test
would catch. That makes one manual run against the real tenant the only
verification there is, so it is not optional.

## Acceptance criteria

- [ ] An authenticated endpoint deletes the provider user first, then cascades
      weeks, plans, profile, identity and the athlete row
- [ ] The ordering rationale is written in the module, not in a route handler
- [ ] A destructive control exists in the app behind an explicit confirmation
      that says the data is not recoverable
- [ ] Deleting an account, then attempting to sign in with the same credentials,
      fails at the provider
- [ ] Run once against the real tenant: the Auth0 user is gone and no row for
      that athlete remains in any of the five tables
- [ ] The partial-failure trade-off is recorded in
      `docs/future_state_after_mvp/todos.md`, not fixed here

## Blocked by

- Blocked by `issues/013-web-app-universal-login.md`

## User stories addressed

- User stories 10, 11, 41

## STATUS

TODO
