## Parent PRD

`issues/auth/prd.md`

## What to build

The cutover: the session becomes the only way into the API, in every environment.
The client can already obtain a session by this point, so nothing the browser
does breaks.

- The session middleware guards every API route. The Basic middleware is removed,
  along with the condition that enabled authentication only in production.
- The shared credential is removed from the application configuration, the
  environment type, the Worker entry point, the local development variables and
  their example file.
- The contract generator is updated: it currently constructs the application with
  the shared credential, which no longer exists, and registers a Basic security
  scheme into the emitted document. The argument is dropped and the scheme
  replaced with the session-cookie scheme, so the published contract describes the
  authentication the server actually has. The contract is regenerated.
- The test kit is rebuilt around signing up and returning a session cookie,
  replacing its Basic header helper and its use of the athlete-creation route.
- Every request in the public API test carries a session cookie, and the four
  tests pinning authentication as production-only are replaced.

This is the largest single commit in the phase, and it cannot be split further:
the tests cannot pass with a half-swapped guard.

See the "Authorization" and "Contract regeneration" sections of the parent PRD.

## Acceptance criteria

- [ ] Every API route requires a valid session cookie, in development as well as production.
- [ ] The Basic middleware, its configuration field, its environment variables and its example entries are all gone.
- [ ] A request with no cookie is unauthorized regardless of environment — replacing the previous "unauthenticated in development" behavior.
- [ ] A request with a tampered cookie is unauthorized.
- [ ] A request with an expired cookie is unauthorized.
- [ ] The authentication routes remain reachable without a cookie.
- [ ] The contract generator compiles without the credential argument and emits the session-cookie security scheme instead of the Basic one.
- [ ] The contract is regenerated and both generated artifacts are committed.
- [ ] The test kit signs up and returns a session cookie, and no longer references the shared credential or the athlete-creation route.
- [ ] The whole public API test suite passes with session cookies on every request.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/auth/008-sign-in-and-sign-out-end-to-end.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 10
- User story 25
- User story 26
- User story 31
- User story 33
