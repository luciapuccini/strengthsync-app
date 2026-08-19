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
The whole flow runs locally — `http://localhost:5173` is an allowed callback,
logout and web origin on the SPA application — so this needs `pnpm dev` in
`client/` and `wrangler dev` in `server/`, not a deployment.

## Found while building this

**`useRefreshTokensFallback` defaults to `false`, and that default breaks the
reload.** The access token is held in memory, which is the point; but so is the
*refresh* token, so a full page reload has nothing left to rotate. With the
default, `getAccessTokenSilently` throws `missing_refresh_token` and every
reload drops the athlete back to the login page — a bug that looks like a
session timeout and is untraceable to a flag nobody set. It is on, explicitly,
in `client/src/main.tsx`. The fallback is silent authentication in a hidden
iframe against the Auth0 session cookie, and it works here only because
`auth.strengthsync.ai` and `app.strengthsync.ai` are the same site. On a vendor
domain that cookie is third-party and Safari refuses it. The custom domain from
issue 010 is what pays for reload surviving at all.

Note the iOS app inverts this: `docs/architecture/auth.md` sets
`useRefreshTokensFallback: false` there, because a WebView blocks the
third-party cookie the fallback depends on. Same flag, opposite value, different
reason — worth not copying one config into the other.

**`/sign-in` came back, as a route rather than a screen.** Both guards redirect a
signed-out visitor to that path, and keeping them unchanged means the path has
to exist. It renders no form — it calls `loginWithRedirect` and shows a spinner.

**That route needs a loop breaker, which is why it is not three lines.** If the
provider says signed-in but `GET /api/me` fails — API down, token refused — the
store settles on signed-out, the guard redirects to `/sign-in`, and a bare
`loginWithRedirect` asks Auth0 to authenticate someone who already has a live
session. Auth0 answers immediately, the app hits the same failure, and the
browser bounces between two domains indefinitely. So the route redirects only
when the provider *also* has nobody, and otherwise stops on a message.

**`GET /api/me` is read twice on a cold load of the tracker** — once by
`resolveSession` for the athlete id, once by `weekResource` alongside the plan
and the week. Accepted: it is one indexed D1 read, and the alternative couples
`weekResource` to the store for a value it currently receives as an argument.

**Deep links do not survive sign-in.** `RequireAuth` redirects to a path and
carries no `returnTo`, because threading one through would mean changing it —
and it is an acceptance criterion here that it does not change. An athlete
opening `/history` while signed out lands on `/track` afterwards. At three
screens that is not worth a guard rewrite.

**The reload shows a consent screen, and the cause is not settled.** A cold
reload has no refresh token in memory, so the SDK falls back to silent
authentication in a hidden iframe with `prompt=none`. That request fails and the
athlete goes through a full redirect and an "Authorize App" dialog before landing
back, signed in. The API's *Allow Skipping User Consent* is confirmed on, which
leaves Auth0's rule that a `localhost` callback is not a verifiable first-party
client — consent cannot be skipped there, so `prompt=none` can never succeed
locally. If that is the whole story it disappears on `app.strengthsync.ai`. Read
the `error=` on the `prompt=none` request to be sure: `consent_required` confirms
it, `login_required` would mean the iframe never saw the session cookie, which is
a different and worse problem.

Not a fix: `cacheLocation: 'localstorage'` would persist the refresh token and
make reloads silent regardless. It would also put a long-lived credential in
`localStorage` and break the criterion directly above it.

**The local database silently lagged the repo by two migrations.** `0004` and
`0005` had never been applied to the miniflare D1, so `client_identities` did not
exist and every provisioning attempt was a 500 out of `findClientIdBySubject`.
`db:migrate:local` is not chained into `dev`, so a local database drifts behind
the branch and only says so from inside a stack trace. Worth chaining, or worth a
check on dev startup.

**PostHog loads four extensions that `posthog.init` did not ask for** —
`surveys.js`, `exception-autocapture.js`, `dead-clicks-autocapture.js` and
`web-vitals.js`. `lib/analytics.ts` sets `autocapture: false`,
`capture_pageview: false` and `disable_session_recording: true`, and says nothing
implicit should leave the browser; these four are switched on by remote config in
the PostHog project settings, where the local flags cannot reach them. In a
signed-in health app that deserves a deliberate decision rather than a default.

**A provisioned athlete's `display_name` is their email address.** Auth0 falls
back to the email for `name` on a password-connection user created without one,
and `getUser` mirrors that so the domain's `min(1)` constraint holds. It is the
designed fallback, but it is also what the athlete reads until onboarding
overwrites it — worth confirming onboarding actually does.

## Acceptance criteria

- [ ] Signing in on the hosted page returns to the app authenticated, and a
      cold reload stays signed in
- [x] The access token is never written to `localStorage` or `sessionStorage` —
      verified in DevTools on 2026-08-19; the only `strengthsync:` keys are the
      week draft and the first-set-logged flag
- [x] Every `/api/*` call carries the bearer header from one wrapper —
      `authorizedFetch` in `client/src/api/client.ts`, which every call reaches
      through the shared `openapi-fetch` client
- [x] `RequireAuth` and `RootRedirect` are unchanged — and `/sign-in` exists as
      a route again so that they can be
- [ ] A cold load calls `GET /api/me` and identifies the athlete to PostHog
- [ ] Sign-out ends the session and a subsequent `/api/*` call answers 401
- [ ] Password reset works end to end from the hosted page
- [ ] Sign in with Apple and sign in with Google each complete once
- [x] A first-time athlete lands in onboarding with no dead screen in between —
      strictly, one click short of onboarding: `RootRedirect` sends every
      signed-in athlete to `/track`, and with no plan the tracker renders its
      "You're all set up" invitation through to `/onboarding`. Unchanged by this
      migration, and routing straight there would mean teaching `RootRedirect`
      about profile state — which the criterion above forbids
- [ ] The full path runs on a phone-sized viewport: sign in, onboard, generate a
      plan, log a day
- [x] Domain, client id and audience are build-time config, and no secret is in
      the bundle — `client/src/lib/auth0.ts`, in git rather than in the
      environment, because none of the three is a secret

## Blocked by

- Blocked by `issues/010-auth0-tenant-setup.md`
- Blocked by `issues/012-token-verification-and-provisioning.md`

## User stories addressed

- User stories 2, 5, 7, 13, 14, 15, 16, 17

## STATUS

IN PROGRESS — sign-in, provisioning, token storage and the first-time landing
are verified against the real tenant. Outstanding: whether the reload's consent
screen is a localhost artifact, the PostHog identify, sign-out, password reset,
Apple, Google, and the phone-viewport run.
