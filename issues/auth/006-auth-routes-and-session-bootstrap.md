## Status

DONE — commit c514126

## Parent PRD

`issues/auth/prd.md`

## What to build

The server side of registration and sign-in, working end to end and verifiable
with an HTTP client, mounted **alongside** the existing Basic gate rather than
replacing it. Nothing that exists today changes behavior in this slice.

- A session middleware that reads the session cookie, resolves the athlete id
  through the session-token module, places it on the request context, and returns
  unauthorized otherwise. In this slice it guards only the session bootstrap
  route.
- An authentication route area with its own endpoint and schema modules, matching
  the structure of every other route area, mounted outside the guard because these
  routes are what mint the token. Handlers compose the password module, the
  credentials repository and the existing athlete-creation function directly; no
  intermediate use-case layer is introduced.
- Sign-up creates the athlete under the seeded coach, stores the hashed
  credential, and returns the athlete with a session cookie.
- Sign-in verifies the credential and returns the athlete with a session cookie.
  A wrong password and an unknown email produce the same response, so the endpoint
  does not reveal who has an account.
- Sign-out clears the cookie.
- A session bootstrap route returns the signed-in athlete, or unauthorized.
- The generated contract is regenerated and both artifacts committed.

See the "Authorization" and "Server modules" sections of the parent PRD.

## Acceptance criteria

- [x] Sign-up with a name, email and password creates both the athlete and the credential, responds with the athlete, and sets the session cookie.
- [x] The new athlete is attached to the seeded coach through the existing creation function, which is unchanged.
- [x] Signing up with an email already registered returns a conflict.
- [x] A password shorter than eight characters returns invalid input, enforced by the request schema.
- [x] Sign-in with correct credentials responds with the athlete and sets the session cookie.
- [x] A wrong password and an unknown email both return unauthorized, with responses a caller cannot tell apart.
- [x] Sign-out clears the cookie.
- [x] The bootstrap route returns the athlete with a valid cookie, and unauthorized with no cookie, a tampered cookie, or an expired one.
- [x] The cookie is HttpOnly, SameSite=Lax and path-wide, and is marked Secure in production.
- [x] The contract is regenerated and both generated artifacts are committed.
- [x] Every pre-existing test still passes untouched — the Basic gate and its production-only condition are not modified in this slice.
- [x] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/auth/001-credentials-table-and-repository.md`
- Blocked by `issues/auth/002-password-hashing-module.md`
- Blocked by `issues/auth/005-session-token-module.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 1
- User story 3
- User story 4
- User story 6
- User story 31
- User story 33
