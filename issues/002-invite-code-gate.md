# 002 — Invite code gate on sign-up

## Parent PRD

`docs/mvp.md`

## What to build

Require an invite code to register, so the cohort is exactly the people who were
invited and paid model calls are bounded by construction.

End to end: a migration adds the column that records which code an account used,
`SignUpInputSchema` gains the field, the sign-up handler rejects a wrong code
before it writes anything, the generated contract is regenerated, and the
sign-up screen collects the code and surfaces the rejection.

The code itself is a Worker secret, one per invite batch, rotated between
batches. Storing the code used on the `client` row means rotation gives cohort
attribution for free — no separate table.

The rejection has to happen before `createClient`, so a bad code leaves no
client row, no credential row, and triggers no model call.

This slice is why captcha, rate limiting and abuse handling are out of MVP scope
— see `docs/mvp.md` §2 for that reasoning and for the accepted risk of a leaked
code.

## Acceptance criteria

- [ ] Sign-up with a missing or wrong code fails with a distinct error code, and
      creates no `client` row and no `credential` row
- [ ] Sign-up with the current code succeeds, and the code used is persisted on
      the client row
- [ ] The valid code is read from a Worker secret and never committed; local dev
      reads it from `.dev.vars`, and the `Env` type declares it
- [ ] A drizzle migration exists under `server/db/drizzle/` and applies cleanly
- [ ] `pnpm gen:openapi` is re-run and `git diff --exit-code` is clean, so CI
      passes
- [ ] The sign-up screen has the field and shows the server's rejection rather
      than a generic failure
- [ ] Server tests cover both the accepted and the rejected path

## Blocked by

None — can start immediately.

## PRD sections addressed

- Scope item 2 (Invite code gate)

## STATUS

TODO
