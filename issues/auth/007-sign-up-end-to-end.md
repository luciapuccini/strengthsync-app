## Parent PRD

`issues/auth/prd.md`

## What to build

The first slice a person can actually use: filling in the sign-up form creates a
real account and lands them in the app as themselves.

- A session slice in the existing store holding a status of loading, in or out
  plus the signed-in athlete, with actions to bootstrap, mark signed in and sign
  out. It occupies the slot the selected-athlete slice will vacate later.
- The app bootstraps the session once on mount.
- The API wrapper module gains sign-up and session-bootstrap calls.
- The route guard gains its third state: a spinner while the session is
  resolving, a redirect to sign-in when signed out, the private tree when signed
  in.
- The root redirect resolves to the signed-in athlete's own tracker rather than a
  hardcoded demo athlete.
- The sign-up form submits for real, disables its button while in flight, and
  shows a persistent error region fed by the typed API error.
- The dummy authentication module — its hardcoded authenticated flag and demo
  athlete id — is deleted outright.

Browser URLs still carry an athlete id in this slice; the newly registered
athlete's own id is what fills them. The empty tracker they land on still shows
today's wording, which is corrected in a later slice.

See the "Client modules" and "Routing and screens" sections of the parent PRD.

## Acceptance criteria

- [ ] The session slice exposes loading, signed-in and signed-out states plus the signed-in athlete, and is covered by tests in the style of the existing store-slice tests.
- [ ] The session is bootstrapped once when the app mounts.
- [ ] The guard renders a spinner while the session resolves, redirects to sign-in when signed out, and renders the private tree when signed in.
- [ ] Opening the root URL while signed in lands on the signed-in athlete's tracker; while signed out it lands on sign-in.
- [ ] Submitting the sign-up form creates an account and leaves the athlete signed in without a second credential entry.
- [ ] The submit button shows progress and refuses a second press while a request is in flight.
- [ ] A duplicate email and a too-short password each produce a message that stays on screen while the field is corrected.
- [ ] The dummy authentication module is deleted and no hardcoded demo athlete id remains anywhere in the client.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/auth/006-auth-routes-and-session-bootstrap.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 1
- User story 2
- User story 3
- User story 4
- User story 13
- User story 14
- User story 18
- User story 19
- User story 28
