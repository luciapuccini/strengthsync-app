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

- [x] Sign-up with a missing or wrong code fails with a distinct error code, and
      creates no `client` row and no `credential` row — a wrong code is 403
      `invalid_invite_code`; a missing one is the schema's 400 `invalid_input`,
      whose message names `invite_code`
- [x] Sign-up with the current code succeeds, and the code used is persisted on
      the client row
- [x] The valid code is read from a Worker secret and never committed; local dev
      reads it from `.dev.vars`, and the `Env` type declares it
- [x] A drizzle migration exists under `server/db/drizzle/` and applies cleanly
- [x] `pnpm gen:openapi` is re-run and `git diff --exit-code` is clean, so CI
      passes
- [x] The sign-up screen has the field and shows the server's rejection rather
      than a generic failure
- [x] Server tests cover both the accepted and the rejected path

## Implementation note

`clients.invite_code` is deliberately **not** part of the domain `Client`, so it
never enters the `Client` component in `openapi.json`. The code is a shared
per-batch secret: returning it in the sign-up, sign-in and session responses
would let any one invitee read it off their own session and pass it on, which
defeats the gate. `getClient` therefore projects the `Client` columns explicitly
instead of `select()`-ing the row. Cohort attribution is a SQL read against the
column.

## Blocked by

None — can start immediately.

## PRD sections addressed

- Scope item 2 (Invite code gate)

## STATUS

TODO
