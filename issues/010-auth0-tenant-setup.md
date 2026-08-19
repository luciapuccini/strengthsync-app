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

## Runbook

Dashboard work, in the order Auth0 asks for it. Values come from
`docs/architecture/auth.md`'s *Tenant objects* table; fill the blanks in
*Recorded values* below as you go, because issues 012 and 013 read them from
there.

### 1. Tenant

Create the tenant if there isn't one. Pick the **EU region** — the cohort is in
Europe, and the region is fixed for the life of the tenant. Set the environment
tag to Production; it is the only tenant this project gets, so a Development tag
would be a lie that costs nothing to avoid now and is not changeable later.

### 2. Card on file

Billing → add a card. The Free plan's custom-domain entitlement needs one for
verification and is not charged at this volume. **Confirm the entitlement in the
dashboard before relying on it** — `auth.md` records it as researched, and plan
terms move.

### 3. Custom domain

Branding → Custom Domains → add `auth.strengthsync.ai`, Auth0-managed
certificates. Auth0 returns a CNAME (and a verification record) to add in
Cloudflare DNS for `strengthsync.ai`.

**The CNAME must be DNS-only — grey cloud, not proxied.** Cloudflare's proxy
terminates TLS itself, which breaks Auth0's domain verification and certificate
issuance, and the failure reads as an opaque "verification pending" rather than
anything pointing at the proxy. This is the step with real wall-clock latency:
DNS propagation plus certificate issuance. Start it before anything else and let
it run while the rest of this list proceeds.

Verify by loading `https://auth.strengthsync.ai/.well-known/jwks.json` — a JSON
key set, not a redirect or a certificate warning. That URL is the one the Worker's
guard fetches in issue 012, so it is the thing actually worth proving.

### 4. API (resource server)

Applications → APIs → Create API.

| Field | Value |
| --- | --- |
| Name | `StrengthSync API` |
| Identifier | `https://api.strengthsync.ai` |
| Signing algorithm | RS256 |

The identifier is the token **audience**. It is not a URL Auth0 ever calls, it
never has to resolve, and it **cannot be changed** after creation — every token
already issued asserts it, and issue 012's guard asserts it back.

Then Settings → Access Settings → **Allow Offline Access: on**. This is what
permits refresh tokens for this audience. Without it the SDK's silent renewal
fails and athletes are signed out when the access token expires.

### 5. Three applications

**a. `StrengthSync Web` — Single Page Application**

| Field | Value |
| --- | --- |
| Allowed Callback URLs | `https://app.strengthsync.ai, http://localhost:5173` |
| Allowed Logout URLs | `https://app.strengthsync.ai, http://localhost:5173` |
| Allowed Web Origins | `https://app.strengthsync.ai, http://localhost:5173` |

`localhost:5173` is the vite dev server (`client/vite.config.ts` sets no port, so
it is vite's default). The production origin is `app.strengthsync.ai`, the Worker's
custom domain in `server/wrangler.jsonc` — note it is a *different* hostname from
the login domain in step 3, deliberately.

Then Settings → Refresh Token Rotation: **on**, and **Reuse Interval: 0** with
reuse detection. Rotation is Auth0's precondition for allowing refresh tokens in
a browser app at all, and it is what makes the design independent of the Auth0
session cookie — which is what stops Safari's tracking prevention from breaking
renewal.

**b. `StrengthSync iOS` — Native**

Same rotation settings. Callback and logout URLs take the form
`{appId}://auth.strengthsync.ai/capacitor/{appId}/callback`. The Capacitor app id
is not decided yet — the iOS app is out of scope for this PRD — so **leave these
blank for now**. They can be added later without touching the web application,
which is the reason the two clients are separate in the first place.

**c. `StrengthSync Management` — Machine to Machine**

Authorize it against the **Auth0 Management API** (the built-in one, not the API
from step 4), with exactly two scopes: `read:users` and `delete:users`. Nothing
else. Issue 012 reads a user at provisioning; issue 014 deletes one. Any further
scope is standing authority for something no code asks for.

### 6. Database connection

Authentication → Database → `Username-Password-Authentication` → Settings →
**Disable Sign Ups: on**.

Check the Applications tab of the connection: enabled for the SPA and the Native
app, **not** for the M2M app.

Then verify by attempting a public sign-up rather than by re-reading the setting —
the acceptance criterion is explicit about this:

```sh
curl -i -X POST https://auth.strengthsync.ai/dbconnections/signup \
  -H 'content-type: application/json' \
  -d '{"client_id":"<SPA_CLIENT_ID>","email":"probe@example.com","password":"Sup3rSecret!x","connection":"Username-Password-Authentication"}'
```

Expect **`HTTP 400`** with the body `{"error":"public signup is disabled"}`.
Confirmed against the real tenant on 2026-08-19 — the status is 400, not the 403
this runbook first claimed, and the body carries a prose `error` string rather
than an error *code*, so do not grep for `signup_disabled`.

A 200 here means the cohort is not closed, and because Auth0's signup endpoint is
publicly callable with only a client id, no screen in our own bundle would have
stopped anyone.

Use the **real SPA client id** from step 5a, not a placeholder. A malformed one
still produced the disabled-signup answer in practice, but it leaves the check
ambiguous: you cannot tell from the response alone whether Auth0 evaluated the
connection's setting or rejected the request earlier for another reason. Running
it with the recorded id removes the doubt and double-checks the value you wrote
into the table below.

### 7. Branding

Branding → Universal Login → Customize: logo, primary colour, page background.

Geist needs a **publicly reachable `.woff2` URL** in the font field — Auth0 cannot
read a font that only exists in the client bundle. If there is no such URL to
hand, leave the default typeface: the palette and logo carry the recognition, and
this is a page each athlete sees once. Do not reach for a custom page template —
`auth.md`'s *Universal Login, not embedded* section has the reasoning.

### 8. Confirm no Actions exist

Actions → Flows → Login: empty. Actions → Library: no custom actions. The PRD's
*no Actions* decision is load-bearing — anything here is logic outside git,
outside typecheck and outside the pre-commit gate.

### 9. The M2M secret

```sh
cd server && wrangler secret put AUTH0_M2M_CLIENT_SECRET
```

Only the secret goes through `wrangler secret`. The domain, the audience and the
three client ids are public identifiers — they identify an application, they do
not authorize anything — so issue 012 puts them in `wrangler.jsonc` vars and
issue 013 puts the web ones in the client bundle. Do not paste the secret into
`.dev.vars` and commit it; `.dev.vars` is gitignored, but the habit is the risk.

### 10. Create one account by hand and follow it through

This is the operator's real invite flow from here on, and the point of doing it
now is to get it wrong while that is still cheap.

Get a Management token:

```sh
curl -s -X POST https://auth.strengthsync.ai/oauth/token \
  -H 'content-type: application/json' \
  -d '{"client_id":"<M2M_CLIENT_ID>","client_secret":"<M2M_SECRET>","audience":"https://<TENANT_DOMAIN>/api/v2/","grant_type":"client_credentials"}'
```

Note the audience is the **tenant** domain (`<tenant>.eu.auth0.com`), not the
custom domain — the Management API audience is not customisable.

Create the athlete with a throwaway password they never learn:

```sh
curl -s -X POST https://<TENANT_DOMAIN>/api/v2/users \
  -H "authorization: Bearer <MGMT_TOKEN>" -H 'content-type: application/json' \
  -d '{"connection":"Username-Password-Authentication","email":"athlete@example.com","name":"Ana","password":"<random-32-chars>","email_verified":false}'
```

Then have Auth0 email them a set-password link:

```sh
curl -s -X POST https://auth.strengthsync.ai/dbconnections/change_password \
  -H 'content-type: application/json' \
  -d '{"client_id":"<SPA_CLIENT_ID>","email":"athlete@example.com","connection":"Username-Password-Authentication"}'
```

Follow that email through to a working sign-in. The email is Auth0-branded and
rate-limited, which `auth.md` accepts at this volume — a real transactional
provider is a post-MVP item, not a blocker here.

Two things this proves that nothing else does: that sign-ups being disabled does
**not** block operator-created accounts, and that the set-password email actually
arrives. If it lands in spam, that is worth knowing before twenty of them go out.

## Recorded values

Issues 012 and 013 consume these. Fill them in as you go.

| Value | Consumed by | Recorded |
| --- | --- | --- |
| Tenant domain (`<tenant>.eu.auth0.com`) | 012 — Management API audience | |
| Custom domain | 012 — issuer + JWKS; 013 — SDK `domain` | `auth.strengthsync.ai` |
| API audience identifier | 012 — `aud` assertion; 013 — SDK `audience` | `https://api.strengthsync.ai` |
| SPA client id | 013 — SDK `clientId` | |
| Native client id | future iOS shell | |
| M2M client id | 012 — Management client | |
| M2M client secret | 012 — Worker secret, never recorded here | `wrangler secret` only |

The issuer issue 012 asserts is `https://auth.strengthsync.ai/` — **with the
trailing slash**. A token's `iss` carries it and a string comparison without it
fails every request, which is a tedious thing to debug in a deployed environment
when the suite cannot catch it.

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
