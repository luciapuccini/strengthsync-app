## Status

DONE — commit 7074aa1

## Parent PRD

`issues/auth/prd.md`

## What to build

Session-addressed equivalents of every data route, added **alongside** the
existing athlete-id routes. Nothing is removed and no existing caller changes, so
the browser's generated types only gain paths.

This add-then-migrate-then-delete shape is deliberate: renaming the paths in one
commit would break the generated types and every browser-side caller
simultaneously, and no intermediate state would be green.

- Session-addressed routes for reading and replacing the profile, reading the
  active plan and a plan by id, reading the current week and listing completed
  weeks, and saving and patching a day log.
- Each takes the athlete's id from the verified session on the request context.
  None accepts an athlete identifier in its path.
- The contract is regenerated and both artifacts committed.

See the "Authorization" section of the parent PRD.

## Acceptance criteria

- [x] Every data route has a session-addressed equivalent covering the same behavior. — eight routes; the two client routes (list all, create) get no equivalent, per the parent PRD's "cut from the HTTP surface".
- [x] No session-addressed route accepts an athlete identifier in its path or body.
- [x] Each derives the athlete solely from the verified session.
- [x] Each is covered by an HTTP-level test asserting it returns the signed-in athlete's data. — `src/app.me.test.ts`, mostly against two registered athletes so "mine" is distinguishable from "theirs".
- [x] The pre-existing athlete-id routes are untouched and all their tests still pass.
- [x] The contract is regenerated and both generated artifacts are committed. — purely additive, 16 → 24 operations, no existing path or schema changed.
- [x] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Notes

The /me routes were added inside the existing `clients`, `plans` and `weeks`
areas rather than in a new `me` area, so those areas keep their subject-matter
split and `issues/auth/013` is a deletion rather than a move.

Two repository functions were added rather than reusing their siblings, because
the siblings throw where a route handler assumes null. Both originals are left
alone: the workflow depends on them throwing, this issue is not to touch the
athlete-id routes, and 013 deletes the routes that misuse them.

- `getProfile` throws when a client has no profile, so
  `GET /api/clients/{clientId}/profile` answers 500 where it declares 404. Not
  reachable from the UI — nothing in the client calls `getProfile` — but the
  route is wrong. `findProfile` returns null.
- `getPlan` reads the *active* plan and throws when there is none, despite its
  name and its `planId`-shaped caller, so
  `GET /api/clients/{clientId}/plans/{planId}` returns the active plan whatever
  id is asked for, and 500s when there is no active plan. Masked today because
  the only caller passes the active plan's id. `findPlanById` reads the plan the
  caller asked for.

## Blocked by

- Blocked by `issues/auth/009-retire-basic-auth.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 24
- User story 31
