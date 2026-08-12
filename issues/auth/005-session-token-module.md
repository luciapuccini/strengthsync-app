## Parent PRD

`issues/auth/prd.md`

## What to build

A small module that issues and reads session tokens, with nothing consuming it
yet.

- Signed JSON Web Tokens using the helpers already bundled with the HTTP
  framework, so no dependency is added.
- The payload carries the athlete's id as the subject plus issued-at and expiry
  claims, and nothing else.
- A fixed thirty-day lifetime, defined here and nowhere else.
- Reading returns the athlete's id for a valid token and nothing for a token that
  is expired, tampered with, signed by a different key, or structurally
  malformed — it never throws at its callers.
- A new signing secret is introduced for the Worker and added to the local
  development variables and their example file, with the Worker's generated types
  refreshed. The shared coach credential variables stay for now; they are removed
  when the guard is swapped.

See the "Session mechanism" and "Server modules" sections of the parent PRD.

## Acceptance criteria

- [ ] A token issued for an athlete reads back to that same athlete id.
- [ ] A token signed with a different secret is rejected.
- [ ] An expired token is rejected.
- [ ] A structurally malformed token is rejected without throwing.
- [ ] A token whose payload has been altered is rejected.
- [ ] The thirty-day lifetime and the payload shape are defined only in this module.
- [ ] The signing secret is present in the local development variables and the example file, and the Worker's generated types include it.
- [ ] No new dependency is added to the manifest.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

None - can start immediately.

## User stories addressed

Reference by number from the parent PRD:

- User story 7
- User story 22
- User story 33
