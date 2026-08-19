# Authentication

Auth0 is the identity provider for both the web app and the iOS app. This
supersedes the "Access: client accounts with signed session cookies" section of
[stack.md](./stack.md), which describes what is in the code today and stops being
true when `issues/011-amputate-old-auth.md` lands.

## Why this replaces the cookie session

The cookie session is correct for a same-origin web app and cannot be carried
into a native one. `server/wrangler.jsonc` serves the SPA and the API from the
single origin `app.strengthsync.ai`, which is why `lib/session.ts` needs no
`domain` attribute, no CORS, and gets `SameSite=Lax` for free. A Capacitor
WebView runs at `capacitor://localhost`, so every request to
`app.strengthsync.ai` becomes cross-site, `SameSite=Lax` refuses to attach the
cookie, and the app 401s on everything while building and launching perfectly.

Matching the WebView origin to `app.strengthsync.ai` via Capacitor's
`server.hostname` looks like a fix and is a trap: Capacitor's scheme handler then
intercepts `/api/*` and answers it from the local bundle. It only works if the
API moves to a separate host, which is a larger change than replacing the
transport.

The token in `lib/session-token.ts` is already the right *shape* — its payload is
`{ sub, iat, exp }`, which is a bearer access token. Only the transport is
cookie-specific. So the change is not "add auth for mobile", it is "stop hand-
rolling the parts an identity provider owns" — password storage, reset, email
verification, social sign-in, rotation and revocation, all of which are either
absent today or listed as post-MVP todos.

Doing this before the first invite batch costs nothing. Afterwards it needs an
Auth0 custom database connection with a custom hash verifier and a backfill, to
migrate PBKDF2 hashes that would not otherwise exist.

## Tenant objects

| Object | Setting |
| --- | --- |
| Custom domain | `auth.strengthsync.ai` — included on the Free plan; requires a credit card on file for verification, which is not charged |
| API (resource server) | Identifier `https://api.strengthsync.ai`, **Allow Offline Access on** |
| Application: web | SPA type, Authorization Code + PKCE |
| Application: iOS | Native type, separate client |
| Application: M2M | Management API, scopes `read:users` and `delete:users` |
| Database connection | **Disable Sign Ups on** |
| Branding | Dashboard theme only — logo, palette, Geist |
| Actions | **None** |

Registering the API is what makes access tokens RS256 JWTs; without it Auth0
issues opaque tokens the Worker cannot verify. Refresh token rotation with
automatic reuse detection is on for both applications: a refresh token presented
twice revokes the whole family. That is Auth0's precondition for allowing refresh
tokens in a SPA, and it is also what makes the design immune to Safari's ITP,
since rotation never depends on the Auth0 session cookie.

**No Auth0 Actions, deliberately.** Every alternative design that needed one —
stamping an internal id as a custom claim, or adding `email`/`name` to the access
token — moves logic into the dashboard, where it is not in git, not typechecked,
and not covered by the pre-commit gate. The costs avoided are paid instead by one
indexed D1 read per request and one Management API call per athlete, both of
which are cheap and both of which live in tested code.

**No invite code.** Public registration is switched off at the connection and the
cohort is created directly through the Management API, so the gate in
`routes/auth/endpoints.ts` has nothing left to guard: every valid token belongs to
someone who was invited, by construction. This deletes `INVITE_CODE`,
`clients.invite_code`, and the splash-screen question entirely. A client-side gate
would not have been one — Auth0's signup endpoint is publicly callable with only a
client id, so a screen in our own bundle stops nobody who looks.

## The token

An access token scoped to the API audience carries `sub`, `iss`, `aud`, `exp`,
`scope` and `azp`. It does **not** carry `email` or `name` — those are ID-token
and userinfo claims. The Worker therefore knows which athlete is calling and
nothing else about them, which is why provisioning reads the rest from the
Management API rather than from the token.

`sub` is per-connection and opaque: `auth0|68a1f2…` for the database connection,
`apple|001234.…` for Sign in with Apple. The same person authenticating two ways
is two subjects unless account linking is enabled — which is why the sub is a
looked-up column and not a primary key.

## Data model

`client_credentials` becomes `client_identities`:

| Column | Note |
| --- | --- |
| `client_id` | Primary key, references `clients.id` |
| `auth_subject_id` | Unique. The Auth0 `sub`. |
| `email` | From the Management API at provisioning |
| `created_at` | |

`password_hash` is dropped — Auth0 holds the credential. The table itself stays
rather than folding into `clients`: identity keeps its own row, so the repository
split survives, and a client that later links several Auth0 identities has
somewhere to put them.

`clients.id` keeps its UUIDs, so the foreign keys in `plans`, `weeks` and
`client_profiles` are untouched. `clients.invite_code` is dropped.
`coaches.auth_subject_id` stays unused: coaches do not authenticate — the MVP has
one seeded coach row (`db/seeds/000_default_coach.sql`) that every client
references, and no coach-facing route exists.

## The request path

1. Hono's JWK middleware verifies RS256 against the cached JWKS at
   `https://auth.strengthsync.ai/.well-known/jwks.json`, asserting `iss` and
   `aud`. This replaces `requireSession`; it ships with Hono, so no dependency is
   added, the same reasoning that put PBKDF2 on WebCrypto.
2. Read `sub` from the verified token.
3. Look up `client_identities.auth_subject_id`. One indexed D1 read. The 10 ms
   Workers limit is CPU time and excludes waiting on I/O, so this is latency, not
   budget.
4. If absent, this is a first request: fetch the user once from the Management
   API for `email` and `name`, insert the `clients` and `client_identities` rows,
   and continue. Provisioning is unconditional — there is nothing left to check.
5. Put `clientId` on the context, exactly as `requireSession` does today, so no
   handler changes.

Caching the JWKS matters for latency and subrequest count, not for CPU.

D1 has no transaction across the two provisioning writes. This is the same
hazard `routes/auth/endpoints.ts:110` already documents for sign-up, and it is
handled the same way: the unique constraint on `auth_subject_id` is what makes
two interleaved first requests safe.

## Web client

`@auth0/auth0-react`, Authorization Code + PKCE, `useRefreshTokens: true`, tokens
held **in memory** — Auth0's recommendation, and `localStorage` is not an
acceptable substitute.

A page reload renews silently, but **not from the refresh token**, and the
difference is a flag that has to be set. The memory cache holds the refresh
token too, so a reload has none left to rotate; renewal falls back to silent
authentication in a hidden iframe against the Auth0 session cookie, which
`useRefreshTokensFallback` gates and which defaults to **false**. Left at its
default, every reload signs the athlete out. It works at all only because
`auth.strengthsync.ai` and `app.strengthsync.ai` are the same site — on a vendor
domain that cookie is third-party and Safari's tracking prevention refuses it,
which is one more thing the custom domain buys. The iOS client sets the same
flag to `false` for the opposite reason, below.

`client/src/api/client.ts` already takes a `baseUrl` and `openapi-fetch` takes a
custom `fetch`, so `getAccessTokenSilently()` is wired in one place.
`sessionSlice`'s `loading | signed-in | signed-out` maps onto the SDK's
`isLoading`/`isAuthenticated`; `requireAuth.tsx` keeps its three-state shape,
only the source of the state changes.

## iOS client

The same SDK plus `@capacitor/browser` and `@capacitor/app`. Login opens the
authorize URL with `Browser.open({ url, windowName: '_self' })`; the app listens
for `appUrlOpen`, calls `handleRedirectCallback(url)`, then closes the browser.
Callback and logout URLs take the form
`{appId}://auth.strengthsync.ai/capacitor/{appId}/callback`.

Two constraints that are easy to miss:

- **`useRefreshTokensFallback: false`.** Mobile WebViews block third-party
  cookies, so iframe silent auth cannot work and must be disabled explicitly or
  renewals fail in a way that looks intermittent.
- **The token cache must be Keychain-backed.** Auth0's guidance is that on
  Capacitor, `localStorage` should be treated as transient because the OS may
  clear it without warning; Capacitor Preferences is not secure storage either.
  This means supplying a custom cache implementation, not a config flag. Skipping
  it produces random sign-outs with no reproducible trigger.

`@capacitor/browser` uses `SFSafariViewController`, which since iOS 11 does not
share cookies with Safari, so there is no SSO between the web app and the iOS
app. Accepted: each is signed into once. An `ASWebAuthenticationSession`-based
plugin is the fix if that changes.

The WebView origin makes `/api/*` cross-origin for the first time, so the Worker
needs CORS — it has none today because it never needed any.

## Universal Login, not embedded

[RFC 8252](https://datatracker.ietf.org/doc/html/rfc8252) requires native apps to
authorize in the system browser rather than an embedded WebView. The iOS app *is*
a WebView, so rendering our own login form inside it is precisely the
anti-pattern the spec exists to prevent. `signIn.tsx` and `signUp.tsx` are
therefore deleted rather than rewired.

What that buys immediately: the Apple and Google buttons in
`socialAuthButtons.tsx`, which render `disabled` with a caption saying social
sign-in isn't available, become real; and the `Forgot password?` button in
`signIn.tsx`, which carries a `TODO: wire password recovery flow`, becomes real.

Branding is the dashboard theme only. A full page template would carry
`authHero.tsx`'s splash treatment across, but it is a second styling surface that
Tailwind and shadcn do not reach and the pre-commit gate cannot check — not worth
it for a page each athlete sees once.

`authHero.tsx` was expected to survive as the onboarding splash. It does not: its
only importers were `signIn.tsx` and `signUp.tsx`, and nothing under
`routes/onboarding/` ever imported it, so deleting those two screens left it dead.
It went with them, along with `publicLayout.tsx`, whose only consumer was the
route group that held them. The splash image itself (`/splash-athlete.png`) is
untouched and still available to whichever screen wants it.

Note that athletes see an Auth0-hosted page regardless: the set-password link for
their pre-created account lands on one.

## Account deletion

App Store Guideline 5.1.1(v) requires account deletion to be initiated from
inside the app, and requires deletion rather than deactivation — so
`CLIENT_STATUSES`' `archived` does not satisfy it. There is no such endpoint in
`server/openapi.json` today; this is the one hard App Store blocker in the
current code.

`DELETE /api/account` deletes the Auth0 user first, then the `client_identities`
row, then cascades the rest in foreign key order: `weeks`, `plans`,
`client_profiles`, `clients`.

That order is chosen for its failure mode, and the failure it is chosen against
is resurrection rather than data loss. Provisioning is unconditional, so if the
local identity row goes while the Auth0 user survives, the next request carrying
that athlete's token does not error — it creates them again, as a new empty
account, and the deletion silently reverses itself into something that looks
like the app erased their training history. Deleting at the provider first, and
aborting locally if that call fails, is what makes that impossible.

The identity row goes second and not last. Deleting the Auth0 user does **not**
lock anyone out on its own: the guard short-circuits on a subject it has already
mapped, so an access token minted a minute earlier keeps working against
whatever rows remain, for the rest of its lifetime. With the identity row
deleted last, that window spans the whole cascade — an athlete can be reading a
half-erased account while it runs, or indefinitely if it wedges. Deleting it
immediately after the provider shrinks the window to the gap between two
adjacent statements. `issues/014-account-deletion.md` carries the full argument.

Accepted trade-off: rows can outlive a deletion request, which is what 5.1.1(v)
is about. At the MVP's scale that is a manual cleanup rather than a system. The
correct version under partial failure is a marker write plus a Cron Trigger that
retries both halves; it needs a new status, a `scheduled` handler and a purge
job, and is not worth building for twenty athletes.

## What this deletes

`lib/password.ts`, `lib/session-token.ts`, `lib/session.ts`,
`db/repositories/credentials.ts` and their tests; `routes/auth/`;
`app.auth.test.ts`; `app.me.test.ts`; `db/seeds.test.ts`, which tested only the
deleted credentials seed and imported the deleted `verify`;
`scripts/hash-password.ts`; `db/seeds/003_demo_credentials.sql`;
`client/src/routes/sign-in/`, `client/src/routes/sign-up/`,
`client/src/components/social-auth-buttons/`, `client/src/components/auth-hero/`,
`client/src/components/public-layout/`; the `ClientCredentialsSchema` in
`domain/model/`; the `SESSION_JWT_SECRET` and `INVITE_CODE` secrets; `/auth/*`
from `run_worker_first` in `server/wrangler.jsonc` and from the dev proxy in
`client/vite.config.ts`; and the `hash-password` and `db:seed:credentials:local`
scripts in `server/package.json`.

The generated contract's security scheme changes with them: `gen-openapi.ts`
declared an `apiKey`-in-cookie scheme named `sessionCookie`, and now declares
`bearerAuth` as `http`/`bearer`/`JWT`. Deleting `/auth/*` also removed the
`Client` schema from `openapi.json` altogether — those were the only routes that
returned one — so `client/src/api/types.ts` hand-declares `Client` until
`GET /api/me` restores it in issue 012.

`GET /auth/session` becomes `GET /api/me`. It still has a job:
`sessionSlice.bootstrapSession` needs the client id for `identifyClient()` in
PostHog.

Four entries leave `future_state_after_mvp/todos.md`: password reset, SSO /
social sign-in, show password in field, and the captcha/fake-user gate.

## Deliberately absent

Roles, organizations, and multi-coach tenancy. MFA — available on the Free plan,
not enabled: it is friction on a twenty-athlete invite cohort and can be turned
on from the dashboard without a code change.

Loops.so cannot be Auth0's email provider — it is API-only with no SMTP relay.
Auth0's built-in email is rate-limited and Auth0-branded, which is acceptable at
this volume; a real provider (SendGrid, Mailgun, SES) is needed before it is not.
