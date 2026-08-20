# Auth0 migration — end-to-end verification playbook

The manual run that says the migration is safe. Written for issue 016, to be
executed by the operator before the first invite batch.

Everything here is a check a person has to make. The automated suite covers 212
cases and deliberately does not cover four things — key-set fetching, issuer and
audience assertions, the Management client's token acquisition, and the account
deletion ordering — because all four are configuration or failure behaviour that
a test would either fake or pin without preserving the reason. **This document is
the coverage for those four.** See `issues/auth0-migration/prd.md`, *Testing
Decisions*.

---

## Before you start: production is behind

**`DELETE /api/account` is not in production.** The last deploy was
`2026-08-20T11:36Z`; issue 014 landed at `11:47Z`, eleven minutes later.
Production is running issues 010–013.

So the very first step is a deploy, and **§1 must be done before anything else
in §3 onwards means anything.**

| | Local | Production |
| --- | --- | --- |
| Code | current branch | 010–013 until you deploy |
| Auth0 tenant | the real one | the same real one |
| Database | miniflare sqlite, seeded demo data | D1 `3d9980fa-e3f2-4a19-9dac-1c63db6132a6` |
| Origin | `localhost:5173` → `:8787` | `app.strengthsync.ai` |

Both environments share one Auth0 tenant. There is no staging tenant, so **an
athlete you delete in a local test is deleted for production too.** Use a
throwaway address per run and never test against your own account.

---

## 1. Environment setup

### 1a. Local

```sh
cd server && pnpm run db:migrate:local   # local D1 silently lags the branch — issue 013
cd server && pnpm dev                    # Worker on :8787
cd client && pnpm dev                    # app on :5173
```

`server/.dev.vars` must contain `AUTH0_M2M_CLIENT_SECRET`. Confirmed present as
of 2026-08-20. If you rotate first (§7), update this file too or every
provisioning attempt fails with a 502.

Sanity check before going further:

```sh
curl -s localhost:8787/health                       # {"ok":true}
curl -s -o /dev/null -w '%{http_code}\n' \
  localhost:8787/api/me                             # 401 — the guard is on
```

### 1b. Production

```sh
cd server && pnpm run deploy    # runs db:migrate:remote, then wrangler deploy
```

Then confirm the deploy actually carried issue 014:

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://app.strengthsync.ai/health   # 200
cd server && pnpm exec wrangler deployments list | tail -5                    # newer than 11:36Z
```

Production vars are in `server/wrangler.jsonc` and are deliberately **not**
secrets — issuer, JWKS URI, audience, both domains, the M2M client id. All are
public identifiers. The only real secret is `AUTH0_M2M_CLIENT_SECRET`.

Confirm what is set (note the digits in the name — a `[A-Z_]` grep silently
misses it, which cost me twenty minutes):

```sh
cd server && pnpm exec wrangler secret list | grep -o '"name": "[A-Z0-9_]*"'
```

Expected today: `AUTH0_M2M_CLIENT_SECRET`, `OPENAI_API_KEY`, and four dead ones
(`INVITE_CODE`, `SESSION_JWT_SECRET`, `WORKFLOW_API_URL`,
`WORKFLOW_SERVICE_SECRET`) that §7 removes.

### 1c. A thing that will look broken and is not

`https://app.strengthsync.ai/auth/session` answers **200 with HTML**. So does
`/auth/sign-in` under GET, and so does `/totally-made-up-path`.

That is the SPA fallback, not a surviving auth route. `/auth/*` was removed from
`run_worker_first` in `wrangler.jsonc`, so the Worker never sees those paths and
the assets binding turns any miss into `index.html`. The Hono app genuinely 404s
them — `server/src/app.me.test.ts:260` pins all six removed paths — but that test
calls the app directly and never goes through the assets layer, so **the test and
the deployed behaviour legitimately disagree.** Judge by the body, not the status:
HTML means unrouted.

---

## 2. Create the throwaway athlete

**In the Dashboard.** The M2M application is scoped to `read:users` and
`delete:users` by design and cannot create anyone — `POST /api/v2/users` with
that token is a 403 no matter how the URL is written.

Dashboard → **User Management → Users → Create User**:

| Field | Value |
| --- | --- |
| Email | a throwaway you control, e.g. `+e2e1@` on your own domain |
| Password | **15+ characters** — the connection policy rejects shorter |
| Connection | `Username-Password-Authentication` |

*Disable Sign Ups* does not block this. It closes the public endpoint only —
that distinction is the whole point of issue 010 step 6.

Keep the `user_id` (`auth0|…`). That is the `sub`.

---

## 3. The happy path — run it twice, once per environment

Run against `localhost:5173` first, then against `app.strengthsync.ai` on a real
phone. The phone run is also issue 013's last open criterion and 008's.

- [ ] **Sign in.** `/` redirects to `auth.strengthsync.ai`. The page carries
      StrengthSync branding — logo, palette, Geist — not Auth0's default.
- [ ] **First-request provisioning.** You land in the app, not an error. This is
      the only step that exercises the Management API, so it is also the proof
      that `AUTH0_M2M_CLIENT_SECRET` is right in this environment.
- [ ] **Onboarding**, then **generate a plan**, then **log a full day and save**.
- [ ] Rows exist in all five tables (local only — see §5 for the query).

### Then the token-lifetime checks, which have never been run on the real origin

- [ ] **Cold reload stays signed in *silently*.** Reload `app.strengthsync.ai`
      with DevTools → Network open. Expect a hidden-iframe `/authorize` call
      that succeeds, **not** a full navigation out to the login page. This is
      issue 013's deferred criterion and it is *unverifiable on localhost*: the
      silent request only works because `auth.strengthsync.ai` and
      `app.strengthsync.ai` are the same site, which is precisely what the
      custom domain was bought for. Do not go hunting for an `error=` query
      parameter — the response mode is `web_message`, so failures arrive in a
      `postMessage` payload and never appear in a URL.
- [ ] **The access token is in memory only.** DevTools → Application → Local
      Storage and Session Storage. The only `strengthsync:` keys should be the
      week draft and the first-set-logged flag. No token, anywhere.
- [ ] **Sign out ends the session.** Press Sign out, then navigate back. You
      should reach the hosted login page, not the app.

### Provider features that are configuration, not code

- [ ] **Password reset** end to end: *Forgot password* → email arrives → set a
      new password → sign in with it.
- [ ] **Sign in with Apple** completes once.
- [ ] **Sign in with Google** completes once.

Each of these is a first: they were disabled captions before the migration. A
social sign-in creates a **second** `sub` for the same human, and therefore a
second athlete — account linking is deliberately off. Expect an empty account,
and do not read it as data loss.

---

## 4. The failure path — the abort check

**Run this before §5, because it leaves the account intact**, so one throwaway
athlete serves both. This is the case with no automated coverage at all.

1. Put a **wrong** `AUTH0_M2M_CLIENT_SECRET` in `server/.dev.vars`.
2. **Restart `pnpm dev`.** The Management client caches its token for the life
   of the process; without a restart a previously minted one is reused and the
   failure never happens.
3. `/account` → type `delete my account` → Delete.

- [ ] The screen stays put and says **"Nothing was removed — please try again."**
- [ ] The response is **502** `provider_unavailable`, not 500
- [ ] Every row from §3 is still present
- [ ] The athlete is still signed in and `/track` still works

**If the rows are gone here, the deletion order has been inverted and the module
is wrong.** That is the entire reason this runs first.

Restore the real secret and restart.

---

## 5. Deletion, and the check nothing else catches

**Capture the access token first.** It is held in memory by design, so DevTools
is the only way to read it: Network → any `/api/*` request → Request Headers →
copy `authorization`. Do this immediately before deleting; the check below is
meaningless with an expired token.

```sh
export ATHLETE_TOKEN='eyJ...'
```

Then `/account` → type `delete my account` → Delete. Expect a redirect back out
to sign-in.

- [ ] **The Auth0 user is gone.** Dashboard → User Management → Users, search the
      email: nothing.
- [ ] **No row survives.** All five counts zero:

```sh
cd server && pnpm exec wrangler d1 execute strengthsync --local --command \
  "SELECT (SELECT COUNT(*) FROM clients          WHERE id='<client_id>')        AS clients,
          (SELECT COUNT(*) FROM client_identities WHERE client_id='<client_id>') AS identities,
          (SELECT COUNT(*) FROM client_profiles   WHERE client_id='<client_id>') AS profiles,
          (SELECT COUNT(*) FROM plans             WHERE client_id='<client_id>') AS plans,
          (SELECT COUNT(*) FROM weeks             WHERE client_id='<client_id>') AS weeks;"
```

Add `--remote` for the production run. Get `<client_id>` before deleting:

```sh
cd server && pnpm exec wrangler d1 execute strengthsync --local --command \
  "SELECT c.id, ci.subject, ci.email FROM clients c
   JOIN client_identities ci ON ci.client_id = c.id WHERE ci.email='<throwaway>';"
```

- [ ] **The resurrection check.** Replay the captured token:

```sh
curl -i https://app.strengthsync.ai/api/me -H "authorization: Bearer $ATHLETE_TOKEN"
```

**401 is the pass.** A **200 carrying a fresh empty client** is the failure this
module exists to prevent: provisioning re-created the athlete, the deletion
silently reversed itself, and to the athlete it looks as though the app erased
their training history and left them signed in. Nothing else catches this.

*Verified locally on 2026-08-20 for `auth0|6a86ece029c739bd12268986` — 401 from
both origins, with `client_identities` confirmed empty for that subject. The
production repeat still needs doing after the deploy in §1b.*

- [ ] **Signing in again fails at the provider.** Try the §2 credentials on the
      hosted page. Auth0 refuses; the request never reaches our origin, so do not
      expect a StrengthSync error page.

---

## 6. Isolation — two athletes, once

Cheap, and it is the guarantee the whole `/me` design exists for. Create a second
throwaway athlete, sign in as each in separate browser profiles, and confirm:

- [ ] Athlete B's `/track` and `/history` show B's data, never A's
- [ ] With A's token, `GET /api/me/plans/{B's plan id}` answers **404**, not B's
      plan
- [ ] With A's token, saving a day into B's week id answers **404**

The suite pins all three, but they are the cases where a regression is a data
breach rather than a bug, so they are worth seeing once with real tokens against
the real verifier.

---

## 7. Rotation — last, immediately before the invite batch

Deliberately the final action. It invalidates a working local setup, so it
should land after everything above passes and just before real athletes arrive.

- [ ] **Rotate the M2M client secret.** It is committed in
      `issues/010-auth0-tenant-setup.md` step 10 and has been in git history
      since `399c40d`, so scrubbing the file is not sufficient. Dashboard →
      Applications → StrengthSync Management → Settings → Rotate. Then
      `wrangler secret put AUTH0_M2M_CLIENT_SECRET`, then `server/.dev.vars`,
      then scrub the file, then untick issue 010's criterion claiming the secret
      appears in no file.
- [ ] **Delete four dead Worker secrets.** None is read by any code:

```sh
cd server
pnpm exec wrangler secret delete INVITE_CODE
pnpm exec wrangler secret delete SESSION_JWT_SECRET
pnpm exec wrangler secret delete WORKFLOW_API_URL
pnpm exec wrangler secret delete WORKFLOW_SERVICE_SECRET
```

`INVITE_CODE` and `SESSION_JWT_SECRET` died with issue 011. The two `WORKFLOW_*`
ones predate the migration entirely and are unrelated to it — flagged because
this is the first time anyone has listed what is actually set.

- [ ] **After rotating, re-run §3's sign-in once** on production. Rotation with a
      stale secret in the Worker breaks provisioning for every new athlete, and
      the first invite batch is the worst possible place to discover it.

---

## What passing this does not prove

Worth saying plainly, so the result is not over-read.

- **Key rotation at the provider.** `createTokenVerifier` refetches on an unseen
  `kid`, and that path is covered by unit tests with a stubbed fetch, but no real
  Auth0 key rotation has ever been observed by this code.
- **Refresh-token reuse detection.** Configured at the tenant, never triggered.
- **Behaviour after the access token actually expires** mid-session, rather than
  on a reload.
- **Concurrent first requests in production.** The race is covered against the
  in-memory test database (`lib/identity.test.ts`), where it is a real race the
  unique constraint decides; D1 under load is not the same substrate.
- **CORS.** There is none, deliberately — nothing is cross-origin yet. The iOS
  shell will be the first cross-origin caller and will need it added.
