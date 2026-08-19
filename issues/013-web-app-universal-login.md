# 013 — Web app on Universal Login

## Parent PRD

`issues/auth0-migration/prd.md`

## What to build

Give the web app a way back in. An athlete signs in on the hosted page at the
project's own domain and returns to a working app.

**Hosted login, not an embedded form.** The OAuth specification for native apps
requires authorization in the system browser rather than an embedded web view,
and the future iOS app *is* a web view — so an embedded form would be precisely
the anti-pattern the spec exists to prevent. Building one for web now would mean
deleting it for iOS later. The screens issue 011 removed are not coming back.

**The SDK, configured for a browser.** Authorization code with PKCE, refresh
tokens enabled, and the access token held in memory rather than in browser
storage. Domain, client id and audience are build-time public values, not
secrets — they identify the application, they do not authorize anything.

**One place attaches the token.** The API client already accepts a base URL and
a custom fetch, so the bearer header goes on in a single wrapper. This is
deliberately a shallow change and not an extracted module.

**The session slice keeps its shape and changes its source.** The three states —
loading, signed-in, signed-out — map onto the SDK's loading and authenticated
flags, so `RequireAuth` and `RootRedirect` are untouched and only where the
state comes from changes. `loading` still exists for the same reason it always
did: on a cold load nobody knows yet whether the athlete is signed in, and the
guard must not redirect while that is open.

**Analytics still needs the internal id.** `GET /api/me` from issue 012 feeds
`identifyClient` on a cold load, which is what keeps the MVP funnel readable
across the migration.

**What becomes real for free.** Password reset, the Apple button and the Google
button all start working — they are provider configuration from issue 010, not
code here. Each still needs to be walked through once.

HITL: none of this is unit-testable in a way that would catch a real
misconfiguration, so verification is a human signing in against the real tenant.

## Acceptance criteria

- [ ] Signing in on the hosted page returns to the app authenticated, and a
      cold reload stays signed in
- [ ] The access token is never written to `localStorage` or `sessionStorage`
- [ ] Every `/api/*` call carries the bearer header from one wrapper
- [ ] `RequireAuth` and `RootRedirect` are unchanged
- [ ] A cold load calls `GET /api/me` and identifies the athlete to PostHog
- [ ] Sign-out ends the session and a subsequent `/api/*` call answers 401
- [ ] Password reset works end to end from the hosted page
- [ ] Sign in with Apple and sign in with Google each complete once
- [ ] A first-time athlete lands in onboarding with no dead screen in between
- [ ] The full path runs on a phone-sized viewport: sign in, onboard, generate a
      plan, log a day
- [ ] Domain, client id and audience are build-time config, and no secret is in
      the bundle

## Blocked by

- Blocked by `issues/010-auth0-tenant-setup.md`
- Blocked by `issues/012-token-verification-and-provisioning.md`

## User stories addressed

- User stories 2, 5, 7, 13, 14, 15, 16, 17

## STATUS

TODO
