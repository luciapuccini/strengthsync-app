## Parent PRD

`issues/auth/prd.md`

## What to build

A small module that hashes a password and verifies one against a stored hash,
with nothing else depending on it yet.

- Key derivation via the platform's WebCrypto, since the usual password-hashing
  libraries are not available on the runtime.
- A fresh random salt per password.
- A self-describing stored format that records the algorithm, its parameters and
  the salt alongside the digest, so the parameters can be changed later without
  invalidating credentials already stored.
- Verification that fails closed on a malformed or tampered stored value rather
  than throwing.

**This slice is HITL.** The iteration count must be chosen from a measurement on
the actual runtime, not copied from a general-purpose recommendation: the free
plan allows ten milliseconds of CPU per request and password hashing is
deliberately expensive. Measure, then decide — the outcome may be a lower
iteration count or an argument for a paid plan. Record the measurement and the
reasoning next to the constant.

See the "Server modules" section of the parent PRD and the key-derivation note in
"Further Notes".

## Acceptance criteria

- [ ] A hash verifies as true against the password it was derived from.
- [ ] Verification returns false for a wrong password.
- [ ] Verification returns false — not an exception — for a tampered, truncated or otherwise malformed stored value.
- [ ] Hashing the same password twice produces two different stored values, proving the salt is per-password.
- [ ] The stored format records its own algorithm and parameters, so a future parameter change can still verify existing values.
- [ ] The iteration count is backed by a measurement on the runtime, with the number and its reasoning recorded in the module.
- [ ] The module depends on neither the database nor HTTP, and its tests need neither.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

None - can start immediately.

## User stories addressed

Reference by number from the parent PRD:

- User story 9
- User story 21
- User story 33
