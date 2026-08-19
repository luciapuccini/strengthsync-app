# 010 — Auth0 tenant setup

## Parent PRD

`issues/auth0-migration/prd.md`

## What to build

No code. The provider-side configuration every later issue reads its values
from, done once in the dashboard and written down here.

**A custom domain.** Athletes authenticate at a StrengthSync hostname, not a
vendor one — this is the invited cohort's first impression of the product. The
free tier includes one, with a card on file for verification and no charge at
this volume.

**An API resource server**, with an identifier that becomes the token audience
and `offline_access` enabled. This is what makes access tokens verifiable signed
JWTs rather than opaque strings; without it issue 012 has nothing to validate
locally and the whole design collapses back to a call to the provider on every
request.

**Three applications.** A single-page app for web, a native app for the future
iOS shell, and a machine-to-machine app authorized against the Management API
with `read:users` and `delete:users` and nothing else. Separate user-facing
clients so callback URLs, refresh policy and revocation move independently.

**Refresh token rotation with automatic reuse detection** on both user-facing
clients. This is the provider's precondition for permitting refresh tokens in a
browser app at all, and it is what removes any dependence on third-party
cookies, which mobile browsers block.

**Sign-ups disabled** at the database connection. The cohort is created through
the Management API instead. This is what removes the invite code as a concept
rather than relocating it — there is no gate to bypass when every account that
exists was created deliberately.

**Dashboard branding only** — logo, palette, typeface. Not a custom page
template; the reasoning is in the PRD's *Login experience* section.

**The M2M client secret** set with `wrangler secret`. Never committed, never in
the browser bundle — the same handling `SESSION_JWT_SECRET` has today.

Finally, create one cohort account by hand through the Management API and follow
the set-password email through to a working sign-in. That is the operator's
actual invite flow from here on, and it should be exercised once while it is
still cheap to get wrong.

## Acceptance criteria

- [ ] The login page loads at a StrengthSync hostname with StrengthSync
      branding; no vendor hostname is visible to an athlete
- [ ] An API resource server is registered with `offline_access`; its audience
      identifier is written into this issue
- [ ] Three applications exist, and the M2M application is scoped to
      `read:users` and `delete:users` only
- [ ] Refresh token rotation with automatic reuse detection is on for both the
      SPA and the native application
- [ ] A public sign-up attempt against the connection is rejected — verified by
      attempting one, not by reading the setting
- [ ] The M2M client secret is set via `wrangler secret` and appears in no file
      in this repository
- [ ] One account is created via the Management API, and its set-password email
      leads to a successful sign-in
- [ ] Domain, audience and the three client ids are recorded in this issue for
      issues 012 and 013 to consume

## Blocked by

None — can start immediately, and runs in parallel with `issues/011-amputate-old-auth.md`.

## User stories addressed

- User stories 1, 3, 4, 18, 19, 21, 22, 23, 24, 27, 28

## STATUS

TODO
