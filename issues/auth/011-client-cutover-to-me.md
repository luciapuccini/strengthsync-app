## Status

DONE — commit 16f8d91

## Parent PRD

`issues/auth/prd.md`

## What to build

The browser stops telling the server which athlete it means. Every API wrapper
moves to the session-addressed routes and loses its athlete-id parameter, and the
athlete-picker screen — which only ever made sense for a coach — is deleted.

- Every API wrapper targets a session-addressed route and takes no athlete id.
- The list-athletes and create-athlete wrappers are removed. The tracker resource
  currently fetches every athlete and searches the list for one name; it asks the
  session bootstrap for the signed-in athlete instead.
- The tracker and history resource caches are no longer keyed by athlete id.
- The tracker and history pages stop reading an athlete id from the URL.
- The athlete-picker page, its creation form, list and credentials-notice
  components, and the selected-athlete store slice are all deleted, along with the
  route that reached the page.
- The browser-side API tests are updated to the new signatures.

Browser URLs still carry an athlete id segment in this slice — it is simply
ignored. Changing the URL shape is the next slice, kept separate so this one stays
reviewable.

See the "Client modules" section of the parent PRD.

## Acceptance criteria

- [x] No API wrapper accepts an athlete id, and none targets an athlete-id route. — one exception, unchanged and out of this phase's scope: `api/workflows.ts` sends `clientId` in the body of `POST /wf/complete-week`. That route is deliberately unauthenticated and outside the API guard, so it has no session to address; the parent PRD defers securing it ("Securing it is a separate piece of work"). Its caller now reads the id from the session-hydrated store rather than from the URL.
- [x] The tracker gets the signed-in athlete's identity from the session rather than by fetching and searching a list of athletes.
- [x] The resource caches are no longer keyed by athlete id and still avoid duplicate in-flight requests. — the tracker is a single promise, since there is only one athlete's tracker to cache; history is keyed by plan alone.
- [x] The athlete-picker page, its three components, the selected-athlete slice and its route are deleted, and nothing imports them.
- [x] No browser code calls a list-athletes or create-athlete endpoint.
- [x] The tracker and history screens still work for the signed-in athlete, including logging a set and completing a week. — covered by the store and resource tests plus typecheck/build; the screens' own behaviour has no component tests, which is a pre-existing gap rather than one this slice introduces.
- [x] The browser-side API tests are updated and passing.
- [x] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Notes

- `weekDraftStorage` still namespaces the local draft by athlete id. That is a
  localStorage key, not an API path, and it matters more now that sign-out
  exists: it is what stops one athlete's unsaved draft appearing for the next
  person on a shared device.
- The `CreateClientInput` type alias was removed with its only consumer. Any
  remaining alias of a schema that `issues/auth/013` deletes from the contract
  will stop compiling when that contract is regenerated — which is the intended
  way to find them.

## Blocked by

- Blocked by `issues/auth/010-add-me-routes.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 11
- User story 24
- User story 32
