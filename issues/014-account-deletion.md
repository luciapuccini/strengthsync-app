# 014 — Account deletion

## Parent PRD

`issues/auth0-migration/prd.md`

## What to build

An authenticated endpoint that deletes the athlete's identity and their training
data, and the control in the app that calls it. App Store Guideline 5.1.1(v)
requires an app that creates accounts to let a user delete one from inside the
app, and the API has no such endpoint today — this is the one store requirement
the current design cannot satisfy at all.

**Order matters, and the order is the module's entire value.** There is no
transaction spanning Auth0 and D1, and none spanning D1's own statements, so
every step of this can fail with the previous ones already done. The order is
chosen so that whichever step fails, the result is recoverable rather than wrong.

### What is actually being designed against

Not data loss. **Resurrection.**

`resolveClientId` in `server/src/lib/identity.ts` provisions unconditionally on a
subject it has not seen. There is no eligibility check left to fail — sign-ups
are disabled at the tenant, so any subject reaching the guard was created by the
operator on purpose. That is correct for onboarding and it is exactly what makes
deletion order load-bearing.

If the local `client_identities` row is deleted while the Auth0 user still
exists, the next request carrying that athlete's still-live token does not
error. The subject is unknown locally, the Management API confirms the user, and
the guard **creates them again** — a new athlete id, an empty account, no
profile, no history. The deletion silently reverses itself, and nothing anywhere
logs a problem. To the athlete it looks as though the app erased their training
history and left them signed in.

That is the failure this ordering exists to make impossible. Every other failure
here leaves rows lying around, which is untidy; this one produces a wrong answer
that looks like a working system.

### The order

1. **Delete the Auth0 user** (`deleteUser` on the Management client). If this
   fails, stop and delete nothing locally. The athlete keeps a working account
   and the request can be retried — the one clean abort in the sequence.
2. **Delete the `client_identities` row.** Immediately after step 1 and before
   any training data, for the reason in the next section.
3. **Then the training data, in foreign-key order:** weeks (which reference
   `plans`), then plans, then the profile, then the `clients` row itself.

### Why the identity row goes second and not second-to-last

An earlier draft of this issue put the identity delete near the end of the
cascade, on the reasoning that the athlete is "already locked out" once the Auth0
user is gone. **That reasoning is wrong**, and the mistake is worth keeping
written down because it is not obvious.

`resolveClientId` short-circuits:

```ts
const known = await findClientIdBySubject(db, subject);
if (known) return known;   // the Management API is never consulted
```

A subject that is already mapped locally never touches Auth0 again. So deleting
the Auth0 user does **not** lock anybody out — it only stops them minting a
*new* token. An access token issued five minutes earlier keeps working, against
whatever local rows still exist, for the rest of its lifetime.

With the identity delete last, that window spans the entire cascade: an athlete
can be reading a half-deleted account — plans gone, profile still there — while
the deletion is in flight or wedged part-way. With the identity delete second,
the window is the gap between two adjacent statements, and after it every request
from that token resolves nothing locally, finds no user at the provider, and gets
the same 401 as a stranger.

So both orders are safe from resurrection. Only one of them closes the window in
milliseconds instead of leaving it open for as long as the cascade takes, or
forever if the cascade dies in the middle.

### Accepted trade-off

Rows can outlive a deletion request: a failure anywhere in step 3 leaves weeks,
plans, a profile or a `clients` row with no identity pointing at them. They are
unreachable by construction — every request arrives as a subject, and that
subject no longer maps to anything — so nothing can read them and nothing will
grow from them. At twenty athletes that is a manual sweep, not a system.

The version that is correct under partial failure needs a marker write plus a
scheduled retrying purge, which the PRD puts out of scope. Record the gap in
`docs/future_state_after_mvp/todos.md` rather than closing it here.

Note the asymmetry that makes this acceptable: leftover rows are recoverable and
invisible, whereas a resurrected account is neither. The ordering above spends
the tolerable failure to buy out the intolerable one.

Archiving does not satisfy the guideline, which is explicit that deletion must
not be deactivation.

HITL: the PRD deliberately leaves this module untested, on the grounds that its
ordering is a decision about failure behaviour rather than something a test
would catch. That makes one manual run against the real tenant the only
verification there is, so it is not optional.

## HITL runbook

Run against the **real Auth0 tenant** with the **local** database: the tenant is
what the check is about, and a local D1 is what makes the row counts readable in
one command. Nothing here needs a deploy.

Values come from `server/wrangler.jsonc` and issue 010. Every `wrangler` command
runs from `server/`.

### 0. Two terminals, and a database that is not behind

```sh
cd server && pnpm run db:migrate:local   # 013 found the local D1 two migrations behind
cd server && pnpm dev                    # Worker on :8787
cd client && pnpm dev                    # app on :5173
```

`.dev.vars` must carry `AUTH0_M2M_CLIENT_SECRET`. Without it every step below
fails at the same place and says nothing useful about the ordering.

### 1. Create a throwaway athlete

Mint a Management token. **Mint and spend it at the custom domain** — a token
minted at `auth.strengthsync.ai` and presented to the tenant domain comes back
401 with nothing in the body to say why. Only the *audience* is the tenant
domain, because the Management API audience is not customisable.

```sh
export M2M_SECRET='<from server/.dev.vars>'
export MGMT=$(curl -s -X POST https://auth.strengthsync.ai/oauth/token \
  -H 'content-type: application/json' \
  -d '{"client_id":"aURi7aSf2Z1YHTZkUzgQURPHIbo8Xmb0",
       "client_secret":"'"$M2M_SECRET"'",
       "audience":"https://dev-ky58kx02q7r2ukt6.us.auth0.com/api/v2/",
       "grant_type":"client_credentials"}' | jq -r .access_token)

curl -s -X POST https://auth.strengthsync.ai/api/v2/users \
  -H "authorization: Bearer $MGMT" -H 'content-type: application/json' \
  -d '{"connection":"Username-Password-Authentication",
       "email":"delete-test@example.com",
       "password":"<15+ characters — the connection policy rejects shorter>",
       "email_verified":true}' | jq '{user_id, email}'
```

Keep the `user_id`. That is the `sub`, and it is what the identity row stores.

### 2. Give the athlete rows in all five tables

Sign in at `http://localhost:5173` as that user, complete onboarding, generate a
plan and log one day. Provisioning writes `clients` and `client_identities`,
onboarding writes `client_profiles`, generation writes `plans` and `weeks`.
Deleting an athlete who only has two rows proves almost nothing.

Do this run on a phone-sized viewport and it also closes issue 013's last
outstanding criterion.

Record what you are about to delete:

```sh
wrangler d1 execute strengthsync --local --command \
  "SELECT c.id, ci.subject, ci.email FROM clients c
   JOIN client_identities ci ON ci.client_id = c.id
   WHERE ci.email = 'delete-test@example.com';"
```

### 3. The abort check, first — because it leaves the account intact

This is the case with no automated coverage at all, and it is cheap: break the
M2M secret and confirm the deletion refuses to start.

Put a wrong `AUTH0_M2M_CLIENT_SECRET` in `.dev.vars` and **restart `pnpm dev`** —
the Management client caches its token for the life of the process, so without a
restart a previously minted one is reused and the failure never happens.

Then press *Delete account* on `/account`. Expect:

- the screen stays put and says **"Nothing was removed — please try again."**
- the request answers **502** `provider_unavailable`, not 500
- every row from step 2 is still there
- the athlete is still signed in and `/track` still works

If the rows are gone here, the order has been inverted and the module is wrong.
That is the whole point of running this one first.

Restore the real secret and restart before continuing.

### 4. Capture the still-live access token

The token is held in memory and never written to storage, so DevTools is the
only way to read it: Network tab → any `/api/*` request → Request Headers → copy
the value of `authorization`.

Do this immediately before step 5. Step 6 is meaningless with an expired token.

```sh
export ATHLETE_TOKEN='eyJ...'
```

### 5. Delete for real

Press *Delete account*, type `delete my account`, confirm. Expect a redirect out
to the hosted page and back to sign-in.

### 6. The three checks that matter

**The Auth0 user is gone.** 404 is the correct answer:

```sh
curl -s -o /dev/null -w '%{http_code}\n' \
  "https://auth.strengthsync.ai/api/v2/users/$(printf %s '<user_id>' | jq -sRr @uri)" \
  -H "authorization: Bearer $MGMT"
```

Or Dashboard → User Management → Users, and search the email. Nothing.

**No row survives in any of the five tables.** All five counts zero:

```sh
wrangler d1 execute strengthsync --local --command \
  "SELECT 'clients' t, COUNT(*) n FROM clients WHERE id='<client_id>'
   UNION ALL SELECT 'identities', COUNT(*) FROM client_identities WHERE client_id='<client_id>'
   UNION ALL SELECT 'profiles',   COUNT(*) FROM client_profiles   WHERE client_id='<client_id>'
   UNION ALL SELECT 'plans',      COUNT(*) FROM plans             WHERE client_id='<client_id>'
   UNION ALL SELECT 'weeks',      COUNT(*) FROM weeks             WHERE client_id='<client_id>';"
```

**The resurrection check — the one nothing else catches.** Replay the captured
token:

```sh
curl -i http://localhost:8787/api/me -H "authorization: Bearer $ATHLETE_TOKEN"
```

**401 is the pass.** A **200 carrying a fresh empty client** is the failure this
whole module exists to prevent: it means provisioning re-created the athlete, the
deletion silently reversed itself, and to the athlete it looks as though the app
erased their training history and left them signed in.

### 7. Signing in again fails at the provider

Try the credentials from step 1 on the hosted page. Expect Auth0 to refuse —
the user no longer exists, and sign-ups are disabled at the connection, so there
is no path back in. Do not expect a StrengthSync error; this one never reaches
our origin.

### Known wrong line in issue 010

Step 8's `curl` in `010-auth0-tenant-setup.md` posts to
`https://https://dev-ky58kx02q7r2ukt6.us.auth0.com/api/v2/users` — a duplicated
scheme, and the tenant domain rather than the custom one. It also pastes a
literal Management token, which is expired but should not have been committed.
Use the form above instead; it is the one `lib/management.ts` actually
implements.

## Acceptance criteria

- [x] An authenticated endpoint deletes the provider user first, then the
      identity row, then cascades weeks, plans, profile and the athlete row —
      `DELETE /api/account`, mounted from `server/src/routes/account/endpoints.ts`
- [x] A failed Auth0 deletion deletes nothing locally and leaves a working
      account — `ManagementError` propagates out of `deleteAccount` before the
      first local statement, and `app.ts` maps it to a 502 rather than letting it
      fall out as a 500, so the UI can say "nothing was removed, try again"
- [x] The ordering rationale is written in the module, not in a route handler —
      including why the identity row goes second rather than last. The handler in
      `routes/account/endpoints.ts` is one call and says so
- [x] A destructive control exists in the app behind an explicit confirmation
      that says the data is not recoverable — `/account`, reached from the header,
      with a typed confirmation rather than a modal: the action is irreversible
      and a modal is dismissed by the same reflex that opened it. It also avoids
      adding a dialog primitive for the one screen that would need one
- [ ] Deleting an account, then attempting to sign in with the same credentials,
      fails at the provider
- [ ] Run once against the real tenant: the Auth0 user is gone and no row for
      that athlete remains in any of the five tables
- [ ] After that run, the athlete's still-live access token is presented to
      `GET /api/me` and answers 401 — **not** 200 with a new empty account,
      which is what a wrong ordering produces and what no other check catches
- [x] The partial-failure trade-off is recorded in
      `docs/future_state_after_mvp/todos.md`, not fixed here

## Blocked by

- Blocked by `issues/013-web-app-universal-login.md`

## User stories addressed

- User stories 10, 11, 41

## STATUS

IN PROGRESS — the endpoint, the module, the cascade and the `/account` screen are
built and the pre-commit gate is green. Outstanding is the HITL run, which is the
only verification this module has and is therefore not optional: delete a real
account against the real tenant, confirm the Auth0 user is gone and no row
survives in any of the five tables, then present that athlete's still-live access
token to `GET /api/me` and confirm 401 rather than 200 with a new empty account.
