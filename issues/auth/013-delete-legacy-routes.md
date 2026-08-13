## Status

DONE — commit 2bf8723

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

- [x] No route accepts an athlete identifier in its path. — ten operations deleted; the only path ids left are a week's and a plan's.
- [x] The list-athletes and create-athlete routes are gone. — and `listClients` with them, see Notes.
- [x] The athlete-creation repository function is retained and sign-up still works through it. — `createClient`, called from `routes/auth/endpoints.ts`; every test in the suite registers through it.
- [x] The regenerated contract contains no path with an athlete identifier, and both artifacts are committed.
- [x] Assertions worth keeping from the removed routes' tests are retargeted rather than deleted. — see Notes for the six that were dropped as duplicates instead.
- [x] A test pins that the removed paths are no longer routed. — `app.public.test.ts`, extended from three pinned paths to thirteen.
- [~] Signing up, signing in, logging a set, completing a week and viewing history all still work end to end. — every leg but one is covered by a test that runs in the gate: sign-up and sign-in in `app.auth.test.ts` (including against the committed seed), logging a set and reading history in `app.me.test.ts`. Completing a week is the workflow, which has no test file at all — its one changed call site is covered by typecheck only. Pre-existing gap, not opened here.
- [x] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`. — 98 server + 75 client tests.

## Notes

- **The contract diff is pure deletion**, verified by script rather than by eye:
  24 → 14 operations, ten removed, none added, and zero changes to any
  surviving operation or to any schema. `ClientListResponse` and
  `CreateClientInput` went with their routes; no client type aliased either, so
  nothing downstream broke.
- **`listClients` was deleted too**, not just its route. The issue names the
  creation function as the one to keep, which reads as: keep what has a caller.
  Reading every client in the database was the capability this phase exists to
  remove, and leaving the function behind leaves it available to the next route
  author. Its test's assertions were folded into the neighbouring `getClient`
  test rather than dropped.
- **Two entries from the parent PRD's defect list are resolved here**, both by
  the deletion itself:
  - `getProfile` throwing where the route declared 404 — the route is gone. The
    function stays for the workflow, where throwing is right, and now says so.
  - `getPlan` reading the *active* plan behind a `{planId}` path — that route is
    gone, and with the workflow left as its only caller the PRD's stated
    condition for renaming it was met. It is now `getActivePlanOrThrow`, and a
    wrapper over `getActivePlan` rather than a second copy of the same query.
- **One test was passing for the wrong reason.** `app.auth.test.ts`'s
  expired-seed test asserted a 404 from a `/clients/{clientId}` path; an
  unrouted path 404s too, so it would have kept passing after the deletion
  while testing nothing. Retargeted at `/api/me/weeks/current` and tightened to
  assert `current_week_not_found`, so the route has to exist and answer.
- **Six tests were dropped rather than retargeted**, each a duplicate of one in
  `app.me.test.ts` once the path changed — listing clients, the profile
  round-trip, the two "404 before anything exists" reads, the status-filter
  rejection and the planId filter. The one assertion `app.me.test.ts` did not
  already make, `completed_at` being set on a saved day, was moved into it.
- `docs/architecture/api_contracts.md` still describes the old route shape and
  operation count. That is `issues/auth/015`'s, which already carries the
  criterion.

## Blocked by

- Blocked by `issues/auth/011-client-cutover-to-me.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 11
- User story 31
- User story 32
