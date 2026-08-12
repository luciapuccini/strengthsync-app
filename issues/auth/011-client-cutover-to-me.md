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

- [ ] No API wrapper accepts an athlete id, and none targets an athlete-id route.
- [ ] The tracker gets the signed-in athlete's identity from the session rather than by fetching and searching a list of athletes.
- [ ] The resource caches are no longer keyed by athlete id and still avoid duplicate in-flight requests.
- [ ] The athlete-picker page, its three components, the selected-athlete slice and its route are deleted, and nothing imports them.
- [ ] No browser code calls a list-athletes or create-athlete endpoint.
- [ ] The tracker and history screens still work for the signed-in athlete, including logging a set and completing a week.
- [ ] The browser-side API tests are updated and passing.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/auth/010-add-me-routes.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 11
- User story 24
- User story 32
