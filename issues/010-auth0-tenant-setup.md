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


| Field             | Value                     | Consumed by                                 | Recorded                           |
| ------------------------- | ------------------------------------------- | ---------------------------------- |
| Tenant domain             | 012 — Management API audience               | `dev-ky58kx02q7r2ukt6.us.auth0.com` |
| Custom domain             | 012 — issuer + JWKS; 013 — SDK `domain`     | `auth.strengthsync.ai`             |
| API audience identifier   | 012 — `aud` assertion; 013 — SDK `audience` | `https://api.strengthsync.ai`      |
| SPA client id             | 013 — SDK `clientId`                        | `Mq77c7idugaOidEbinlBecjwKuhJlLPZ` |
| Native client id          | future iOS shell                            | `CxC8eL0VlcbDtoDlQM1M981NJlV1ixLY` |
| M2M client id             | 012 — Management client                     | `4amnaROizbljyXZOV5inS5qWB0khv6SN` |
| M2M client secret         | 012 — Worker secret, never recorded here    | `wrangler secret` + `.dev.vars`    |

The Management API audience is the **tenant** domain with a trailing
`/api/v2/` — `https://dev-ky58kx02q7r2ukt6.us.auth0.com/api/v2/`. It is not
customisable, so it stays on the vendor hostname even though everything an
athlete touches does not.

The issuer issue 012 asserts is `https://auth.strengthsync.ai/` — **with the
trailing slash**. A token's `iss` carries it and a string comparison without it
fails every request, which is a tedious thing to debug in a deployed environment
when the suite cannot catch it.

## Acceptance criteria

- [x] The login page loads at a StrengthSync hostname with StrengthSync branding;
      no vendor hostname is visible to an athlete
- [x] An API resource server is registered with `offline_access`; its audience
      identifier is written into this issue
- [x] Three applications exist, and the M2M application is scoped to `read:users`
      and `delete:users` only
- [x] Refresh token rotation with automatic reuse detection is on for both the
      SPA and the native application
- [x] A public sign-up attempt against the connection is rejected — verified by
      attempting one, not by reading the setting
- [x] The M2M client secret is set via `wrangler secret` and appears in no file in
      this repository
- [x] One account is created — **in the Dashboard, not via the Management API**,
      which the M2M app is deliberately not scoped for — and its set-password
      email leads to a successful sign-in
- [x] No client secret and no Management API access token appears anywhere in this
      repository, including in this file
- [x] Domain, audience and the three client ids are recorded in this issue for
      issues 012 and 013 to consume

## Verified end state

The custom domain is live and serving, checked against the provider rather than
against the dashboard:

```
$ dig +short auth.strengthsync.ai
dev-ky58kx02q7r2ukt6-cd-onroqh59na28rtdn.edge.tenants.us.auth0.com.

$ curl https://auth.strengthsync.ai/.well-known/openid-configuration
"issuer":"https://auth.strengthsync.ai/"
"jwks_uri":"https://auth.strengthsync.ai/.well-known/jwks.json"
```

The `-cd-` record is Auth0's custom-domain edge; its presence is what confirms
the Cloudflare CNAME stayed DNS-only. The issuer carries the trailing slash that
issue 012 must compare against.

## Findings

**The vendor sender cannot be fixed here.** Emails arrive from
`no-reply@auth0user.net`. That address belongs to Auth0's built-in email
provider, not to the tenant or the custom domain, and it is not configurable —
only replacing the provider changes it. Beyond branding this costs deliverability:
`auth0user.net` has no SPF/DKIM alignment with `strengthsync.ai`, so the invite is
being sent from a domain unrelated to the product. Recorded for
`docs/todos/008-launch-readiness.md`, which is the gate the first invite batch
passes through; still not a blocker for this issue.

**Dashboard account creation fires a second, unwanted email**, resolved in step 8
by turning the verification template off. See that step for the reasoning.

## Open decisions

**Tenant region is US (`prod-us-5`), not EU.** Fixed at tenant creation and not
changeable — moving means a new tenant. The cohort is in Spain and the product
stores body-composition measurements, so EU residency is the more defensible
default. Accepted for now because there are zero real accounts, which also means
this is the cheapest it will ever be to redo. Revisit before the first invite
batch, not after.

**The database connection requires a 15-character minimum password.** Every
athlete meets this while setting their own password from the invite email, on a
phone. Left as configured; if the first batch stalls here, the connection's
password policy is a dashboard change with no code impact.

## Blocked by

None — can start immediately, and runs in parallel with `issues/011-amputate-old-auth.md`.

## User stories addressed

- User stories 1, 3, 4, 18, 19, 21, 22, 23, 24, 27, 28

## STATUS

DONE