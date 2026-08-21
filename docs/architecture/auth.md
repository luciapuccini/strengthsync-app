# Authentication

Auth0 is the identity provider. Athletes authenticate on a hosted page at
`auth.strengthsync.ai`; the browser holds a short-lived RS256 access token and
sends it as a bearer credential on every `/api/*` request; the Worker verifies it
against the tenant's published key set and turns the subject into an internal
athlete id. Handlers receive that id and nothing else — no token, no issuer, no
subject.

This is the description of record for identity. [stack.md](./stack.md) carries
one row and points here; [api_contracts.md](./api_contracts.md) describes what
the guard means for the HTTP surface.

## Tenant objects


| Object                | Setting                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Custom domain         | `auth.strengthsync.ai` — included on the Free plan; requires a credit card on file for verification, which is not charged at this volume |
| API (resource server) | Identifier `https://api.strengthsync.ai`, RS256, **Allow Offline Access on**                                                             |
| Application: web      | SPA type, Authorization Code + PKCE, refresh token rotation with reuse detection                                                         |
| Application: iOS      | Native type, separate client, same rotation settings; its callback URLs are blank until the shell exists                                 |
| Application: M2M      | Management API, scopes `read:users` and `delete:users`, nothing else                                                                     |
| Database connection   | `Username-Password-Authentication`, **Disable Sign Ups on**                                                                              |
| Social connections    | Sign in with Apple and Sign in with Google                                                                                               |
| Branding              | Dashboard theme only — logo, palette, typeface                                                                                           |
| Actions               | **None**                                                                                                                                 |


The values are in git, in two places: `server/wrangler.jsonc` `vars` holds the
issuer, the JWKS URL, the audience, the tenant domain and the M2M client id, and
`client/src/lib/auth0.ts` holds the login domain, the SPA client id and the
audience. Every one of them is public — the issuer and key set are served
unauthenticated, the audience and client ids travel in tokens and in the browser
— so they identify applications and authorize nothing, and keeping both halves
visible is what makes a mismatch between them reviewable. `AUTH0_ISSUER` keeps
its trailing slash, because it is compared to the `iss` claim as a string and
Auth0 mints it that way. The one real secret is `AUTH0_M2M_CLIENT_SECRET`, set
with `wrangler secret` in production and in `server/.dev.vars` locally.

Registering the API is what makes access tokens RS256 JWTs; without it Auth0
issues opaque tokens the Worker cannot verify. Refresh token rotation with
automatic reuse detection is on for both user-facing applications: a refresh
token presented twice revokes the whole family. That is Auth0's precondition for
allowing refresh tokens in a SPA, and it is also what makes the design immune to
Safari's ITP, since rotation never depends on the Auth0 session cookie.

**No Auth0 Actions, deliberately.** Every alternative design that needed one —
stamping an internal id as a custom claim, or adding `email`/`name` to the access
token — moves logic into the dashboard, where it is not in git, not typechecked,
and not covered by the pre-commit gate. The costs avoided are paid instead by one
indexed D1 read per request and one Management API call per athlete, both of
which are cheap and both of which live in tested code.

**No public registration, and so no invite code.** Sign-ups are off at the
connection and the cohort is created directly through the Management API, so
every subject that reaches the guard belongs to somebody the operator created on
purpose. That is what lets provisioning be unconditional, and it is why there is
no gate in front of it: there is nothing left to guard. A client-side gate would
not have been one — Auth0's signup endpoint is publicly callable with only a
client id, so a screen in our own bundle stops nobody who looks.

## The token

An access token scoped to the API audience carries `sub`, `iss`, `aud`, `exp`,
`scope` and `azp`. It does **not** carry `email` or `name` — those are ID-token
and userinfo claims. The Worker therefore knows which athlete is calling and
nothing else about them, which is why provisioning reads the rest from the
Management API rather than from the token.

`sub` is per-connection and opaque: `auth0|68a1f2…` for the database connection,
`apple|001234.…` for Sign in with Apple. The same person authenticating two ways
is two subjects, and therefore two athletes, because account linking is off —
which is why the subject is a looked-up column and not a primary key.

## Data model

`client_identities` (`server/src/db/schema.ts`) is the whole of what identity
costs the database:


| Column                     | Note                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `client_id`                | Primary key, references `clients.id`. One identity per athlete, stated rather than merely observed                           |
| `subject`                  | Unique. The Auth0 `sub`                                                                                                      |
| `email`                    | What the Management API said at provisioning, cached so the operator can find an athlete by the address they were invited at |
| `created_at`, `updated_at` |                                                                                                                              |


Auth0 holds the credential; nothing here authenticates, and `email` in
particular is a lookup convenience and not an identifier the guard trusts.

The table is its own rather than a column on `clients` because it is where the
provider's vocabulary stops: internal ids never change, so every foreign key in
the training data is indifferent to all of this, and an athlete who later links
several Auth0 identities has somewhere to put them (a surrogate key migration,
mechanical). The unique constraint on `subject` is load-bearing rather than
hygiene — see the race below.

`clients.id` is a UUID, and `plans`, `weeks` and `client_profiles` key off it.
`coaches.auth_subject_id` exists and is unused: coaches do not authenticate — the
MVP has one seeded coach row (`db/seeds/000_default_coach.sql`) that every client
references, and no coach-facing route exists.

## The request path

`requireAuth` (`server/src/lib/auth.ts`) is mounted on `/api/*` in `app.ts`, in
every environment — there is deliberately no development exemption, because a
guard that is off while the code is being written is a guard nobody tests. Only
`GET /health` and the `/ingest/*` PostHog pipe sit outside it, and neither is an
application route.

1. Read the bearer token from `Authorization`. Anything else is refused here.
2. Verify it. `createTokenVerifier` checks the RS256 signature against the
enant's key set from `https://auth.strengthsync.ai/.well-known/jwks.json`,
sserting both `iss` and `aud`: without `iss` any Auth0 tenant's token is
ccepted, and without `aud` a token minted for a different API of this same
enant is. The algorithm is pinned, so a token cannot nominate its own weaker
ne.
3. `resolveClientId` (`lib/identity.ts`) looks the subject up in
client_identities`. One indexed D1 read. The 10 ms Workers limit is CPU time
nd excludes waiting on I/O, so this is latency, not budget.
4. If the subject is unknown, this is a first request: fetch the user once from
he Management API for `email` and `name`, insert the `clients` and
client_identities` rows, and continue.
5. Put `clientId` on the context. That is the guard's entire output; handlers
ead it and never see a token, an issuer or a subject.

The key set is cached and invalidated by exactly one thing: a `kid` it has never
seen. Fetching per request would put a round trip in front of every API call;
fetching once and never again would make key rotation an outage lasting until the
Worker is redeployed. Asking the header which key it wants distinguishes
"rotated" from "forged" without either cost. This matters for latency and
subrequest count, not for CPU.

**One rejection for every cause.** Missing, malformed, expired, wrong audience,
wrong issuer, and unknown-at-the-provider all answer the same `401`: a caller
learns that it needs credentials, not which part of what it sent was wrong. The
last of those is a real case — a token outlives the account it names, so a
request from an athlete deleted mid-session arrives verified and resolves to
nobody.

D1 has no transaction across the two provisioning writes, so the unique
constraint on `subject` is what makes two simultaneous first requests safe. The
athlete row has to exist before the identity row can point at it, which means the
loser of that race is holding a `clients` row nobody will ever reach — every
request arrives as a subject, and that subject now maps to the winner. So the
loser deletes its own row on the way out (`deleteUnboundClient`). Without that
the constraint still prevents two identities; what it does not prevent is
invisible orphans accumulating.

The suite covers this path with stub verifiers and a fake D1, which is what keeps
it offline and fast. Four things are deliberately outside it — key-set fetching,
the issuer and audience assertions, the Management client's token acquisition,
and the account deletion ordering — because a test would either fake the
configuration or pin the behaviour without preserving the reason.
[auth0-e2e-verification.md](../todos/auth0-e2e-verification.md) is the coverage
for those four, and a wrong issuer, audience or JWKS URL is the first thing to
check when a token that should work does not.

## Web client

`@auth0/auth0-react`, Authorization Code + PKCE, tokens held **in memory**:
`cacheLocation` is left at its default so no access token is ever written to
`localStorage`, where any script on the page can read it. `redirect_uri` is the
app's own origin, so the SDK strips `?code=&state=` from whatever route the
browser lands on and there is no callback route of ours to maintain.

`useRefreshTokens` and `useRefreshTokensFallback` are both on, and the second is
set explicitly because its default is `false`. The memory cache holds the refresh
token too, so a full page reload has none left to rotate; renewal falls back to
silent authentication in a hidden iframe against the Auth0 session cookie, which
that flag gates. Left at its default, every reload would sign the athlete out. It
works at all because `auth.strengthsync.ai` and `app.strengthsync.ai` are the
same site — on a vendor domain that cookie is third-party and Safari's tracking
prevention refuses it, which is one more thing the custom domain buys.

Everything Auth0-aware in the signed-in half of the app is two effects in
`App.tsx`, in this order: one registers `getAccessTokenSilently` with the API
client, the other keeps the store's session status in step with the SDK's
`isLoading`/`isAuthenticated`. The order is not incidental — resolving the
session calls `GET /api/me`, which needs the token the first effect supplies.

- `client/src/api/client.ts` attaches the credential in exactly one place,
`authorizedFetch`, so no route can be added without one. Every `401` runs the
unauthorized handler, which clears the session; the route guard reads that and
returns the athlete to sign-in from wherever they were.
- `sessionSlice` is `loading | signed-in | signed-out`, and `loading` is the
initial state: being authenticated is not the same as being resolved, since the
provider knows the `sub` and not the internal athlete id. `GET /api/me` supplies
that id, which the browser needs to identify the person to PostHog and to key
the local week draft. It is not a session check — by the time it answers, the
credential has already been accepted or the call has already 401ed.
- `/sign-in` renders nothing an athlete reads. It is a route rather than a call
inside the guard so that both guards stay as they are — they redirect to a
path, and the path turns itself into an authorize request. It stops instead of
redirecting when the provider says the athlete is signed in but the store says
otherwise, which is what keeps a failing `GET /api/me` from bouncing the
browser between two domains forever. There is no `/sign-up`.
- Signing out is two things: clearing the store ends the session in this tab, and
`logout({ returnTo: origin })` ends it at Auth0, which is what actually revokes
the refresh token. Local first, then the redirect, so nobody sits looking at
their own training data during a slow navigation. `returnTo` must be a
registered Allowed Logout URL or Auth0 refuses.

## Universal Login, not embedded

Authorization happens on Auth0's hosted page. [RFC
8252](https://datatracker.ietf.org/doc/html/rfc8252) requires native apps to
authorize in the system browser rather than an embedded WebView, and the iOS
shell *is* a WebView, so rendering our own login form is precisely the
anti-pattern the spec exists to prevent — the web app uses the same hosted page
so the two clients differ only in how the browser is opened.

Password reset, Sign in with Apple and Sign in with Google are properties of that
page rather than features of this codebase, which is why they are configuration
and not code here. So is the captcha question, answered more completely by
disabling public sign-ups than a gate would have been.

Branding is the dashboard theme only. A full page template is a second styling
surface that Tailwind and shadcn do not reach and the pre-commit gate cannot
check — not worth it for a page each athlete sees once. Geist needs a publicly
reachable `.woff2` URL to appear there at all; without one the default typeface
stands and the logo and palette carry the recognition.

Athletes see that page on the way in regardless: the set-password link for their
pre-created account lands on it.

## Account deletion

App Store Guideline 5.1.1(v) requires account deletion to be initiated from
inside the app, and requires deletion rather than deactivation — so
`CLIENT_STATUSES`' `archived` does not satisfy it.

`DELETE /api/account` deletes the Auth0 user first, then the `client_identities`
row, then cascades the rest in foreign key order: `weeks`, `plans`,
`client_profiles`, `clients`. The sequence lives in
`server/src/lib/account-deletion.ts`; the handler in `routes/account/endpoints.ts`
is one call, and the route has its own area because it is the only one that needs
the Management API. It takes no body and no path parameter — the athlete comes
from the verified token, so "delete someone else's account" is not a request the
API can express.

A refused Auth0 deletion answers **502**, not 500: nothing local was touched, the
athlete still has a working account and the request is retryable, so `app.ts`
maps `ManagementError` to `provider_unavailable` rather than letting it fall out
as an internal error. The `/account` screen says so — "Nothing was removed" — and
stays put rather than signing anyone out of an account that still exists.

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
adjacent statements.

Accepted trade-off: rows can outlive a deletion request, which is what 5.1.1(v)
is about. They are unreachable — every request arrives as a subject, and that
subject maps to nothing — so nothing reads them and nothing grows from them. At
the MVP's scale that is a manual cleanup rather than a system, and
[deleting-an-athlete.md](../operations/deleting-an-athlete.md) is the runbook for
it — including the case this section does not cover, where the operator deletes
the user in the Auth0 dashboard and D1 is never told. The correct version under
partial failure is a marker write plus a Cron Trigger that retries both halves;
it needs a new status, a `scheduled` handler and a purge job, and is not worth
building for twenty athletes.

## The iOS client

Not built. The Capacitor shell is [its own piece of
work](../todos/ios-bootstrap-brief.md); what this document owns is the two
identity constraints that are already decided, because both are the kind of thing
that is discovered late and expensively:

- `**useRefreshTokensFallback: false`,** the inverse of the web app's setting.
Mobile WebViews block third-party cookies, so iframe silent auth cannot work
and must be disabled explicitly or renewals fail in a way that looks
intermittent.
- **The token cache must be Keychain-backed.** Auth0's guidance is that on
Capacitor, `localStorage` should be treated as transient because the OS may
clear it without warning; Capacitor Preferences is not secure storage either.
This means supplying a custom cache implementation, not a config flag. Skipping
it produces random sign-outs with no reproducible trigger.

Two consequences to expect rather than debug. `@capacitor/browser` uses
`SFSafariViewController`, which since iOS 11 does not share cookies with Safari,
so there is no SSO between the web app and the iOS app — each is signed into
once, accepted. And the WebView origin makes `/api/*` cross-origin for the first
time, so the Worker will need CORS; it has none today because `wrangler.jsonc`
serves the SPA and the API from one origin.

## Deliberately absent

Roles, organizations, and multi-coach tenancy. Account linking, so one human with
two connections is two athletes. MFA — available on the Free plan, not enabled:
it is friction on a twenty-athlete invite cohort and can be turned on from the
dashboard without a code change.

Loops.so cannot be Auth0's email provider — it is API-only with no SMTP relay.
Auth0's built-in email is rate-limited and sends from a `no-reply@auth0user.net`
address that is not configurable, which is acceptable at this volume; a real
provider (SendGrid, Mailgun, SES) is needed before it is not, and
[008-launch-readiness.md](../todos/008-launch-readiness.md) tracks it where it
bites.



## Notes with findings during the e2e swipe

1. prod was the dev environment keys usage warning for auth0 modal
2. sign out show as an intermitiadte flick screen the error "We could not load your account". lets make sure the state machine of the flow is clearly defined somewhere. we can live with this in the MVP, so TODO

