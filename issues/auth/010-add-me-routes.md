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

- [ ] Every data route has a session-addressed equivalent covering the same behavior.
- [ ] No session-addressed route accepts an athlete identifier in its path or body.
- [ ] Each derives the athlete solely from the verified session.
- [ ] Each is covered by an HTTP-level test asserting it returns the signed-in athlete's data.
- [ ] The pre-existing athlete-id routes are untouched and all their tests still pass.
- [ ] The contract is regenerated and both generated artifacts are committed.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/auth/009-retire-basic-auth.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 24
- User story 31
