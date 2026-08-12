## Parent PRD

`issues/auth/prd.md`

## What to build

The final step of the add-migrate-delete sequence: remove the athlete-id routes
now that nothing calls them, so that cross-athlete access stops being expressible
rather than merely unused.

- Every data route addressed at a specific athlete is deleted.
- The list-athletes and create-athlete routes are deleted. The athlete-creation
  repository function is kept — sign-up calls it.
- The contract is regenerated. The resulting document contains no path carrying an
  athlete identifier.
- The public API tests for the removed paths are retargeted at their
  session-addressed equivalents where the assertion still has value, and a test
  pins that the removed paths are no longer routed. There is precedent for exactly
  this in the suite, from the earlier audit that cut three consumerless routes.

See the "Authorization" section of the parent PRD, and the consumerless-route note
in "Further Notes" regarding the plan-by-identifier read.

## Acceptance criteria

- [ ] No route accepts an athlete identifier in its path.
- [ ] The list-athletes and create-athlete routes are gone.
- [ ] The athlete-creation repository function is retained and sign-up still works through it.
- [ ] The regenerated contract contains no path with an athlete identifier, and both artifacts are committed.
- [ ] Assertions worth keeping from the removed routes' tests are retargeted rather than deleted.
- [ ] A test pins that the removed paths are no longer routed.
- [ ] Signing up, signing in, logging a set, completing a week and viewing history all still work end to end.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/auth/011-client-cutover-to-me.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 11
- User story 31
- User story 32
