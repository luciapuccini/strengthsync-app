# 011 — Amputate the old auth system

## Parent PRD

`issues/auth0-migration/prd.md`

## What to build

Remove the hand-rolled authentication system entirely, in one commit, leaving
`/api/*` guarded by a middleware that rejects everything. Nothing replaces it
here — issue 012 does that. The point of doing the removal first is that every
issue after it works against one system instead of keeping two of them green.

**Server.** Delete `lib/password.ts`, `lib/session-token.ts`, `lib/session.ts`,
`routes/auth/`, and `db/repositories/credentials.ts`, along with their tests
(`password.test.ts`, `session-token.test.ts`, `credentials.test.ts`,
`app.auth.test.ts`). `AppConfig` loses `sessionSecret` and `inviteCode`, so
`SESSION_JWT_SECRET` and the batch invite code can be deleted as Worker secrets.

**The guard becomes a stub, not a hole.** `requireAuth` replaces
`requireSession` on `/api/*` with the same middleware signature and the same
`clientId` context variable, and rejects every request with the same 401 shape.
It exists in this issue solely so that no route handler is touched: the handlers
read `clientId` off the context, and removing the middleware that declares it
would break typecheck across every route. Issue 012 fills it in.

**Schema.** A migration drops `client_credentials` and `clients.invite_code`.
The demo-credentials seed (`server/db/seeds/003_demo_credentials.sql`) goes with
them. `coaches.auth_subject_id` stays as it is — unused, and coaches do not
authenticate.

**Tests.** `app.me.test.ts` and the session-dependent half of
`app.public.test.ts` are deleted rather than adapted, and rewritten in 012.
`app.public.test.ts` keeps only the cases that never touched a session — the
`/health` liveness case and the four `/ingest` proxy cases — because those have
nothing to do with authentication and deleting them would lose coverage for no
reason.

**This leaves the API's ownership isolation uncovered until 012 lands.** That is
the accepted cost of the sequencing, and the mitigation is that issue 012
carries the full inventory of deleted cases as acceptance criteria. That
inventory must be verified as complete before this issue merges.

**Client.** Deleting `/auth/*` regenerates `openapi.d.ts` without `SignInInput`
and `SignUpInput`, so `client/src/api/client.ts` fails typecheck immediately —
the client half of this change is coupled through the generated contract and
cannot be split into its own issue. Remove the sign-in and sign-up screens,
their tests and their routes in `App.tsx`; remove `signIn`, `signUp`,
`getSession` and `signOut` from the API client; keep `SessionSlice`'s three
states so `RequireAuth` and `RootRedirect` do not change, with
`bootstrapSession` resolving to `signed-out` until 013 re-sources it from the
SDK. The sign-out button clears local state only.

After this merges the app compiles, passes and deploys, but nobody can sign in
and every `/api/*` request answers 401. That is expected. There are no
production users, and launch is still gated on `issues/008-launch-readiness.md`.

## Acceptance criteria

- [x] `lib/password.ts`, `lib/session.ts`, `lib/session-token.ts`,
      `routes/auth/`, the credentials repository and their four test files are
      deleted — plus a fifth, `db/seeds.test.ts`, which tested only the deleted
      credentials seed through the deleted `verify`
- [x] A migration drops `client_credentials` and `clients.invite_code`
      (`0004_sticky_barracuda.sql`); the demo-credentials seed is removed
- [x] `AppConfig` no longer carries `sessionSecret` or `inviteCode`
- [x] `requireAuth` is mounted on `/api/*`, sets no `clientId`, and answers 401
      with the existing error envelope — no route handler is modified
- [x] The client's sign-in and sign-up screens, routes, tests and API functions
      are removed, and `openapi.d.ts` regenerates with no `/auth` paths
- [x] `app.public.test.ts` retains the `/health` and `/ingest` cases — **and two
      more than this criterion allowed for**, see *Deviations* below
- [x] The inventory of deleted API test cases is present in
      `issues/012-token-verification-and-provisioning.md` before this merges —
      verified case by case; two entries were added there and two struck with a
      reason
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass (server 132 → 60 tests,
      client 91 → 63), plus `wrangler deploy --dry-run`

## What this touched beyond the plan

Seven things the issue did not list, found by reading the code rather than the
plan. All are consequences of the same deletion, so they belong in this commit.

1. **`client/src/api/weekResource.ts` called `getSession()`** inside
   `Promise.all([getSession(), getActivePlan(), getCurrentWeek()])`. It now
   resolves `client: null`. That is load-bearing — `reconcileWeekDraft` keys the
   local week draft by athlete id and `trackerSlice.saveDay` refuses to write
   without one — so it is recorded as an interim compromise in issue 012 rather
   than left to be noticed later.
2. **The `Client` schema left the contract entirely.** `/auth/sign-up`,
   `/auth/sign-in` and `/auth/session` were the only routes returning one, so
   `openapi.json` no longer defines it and `client/src/api/types.ts` had to
   hand-declare it. Also recorded in issue 012; it is the one place the project's
   schema-at-the-boundary rule is suspended.
3. **`authHero.tsx` and `publicLayout.tsx` were dead on arrival.**
   `docs/architecture/auth.md` said the hero survives as the onboarding splash;
   nothing under `routes/onboarding/` ever imported it. Both deleted, and that
   sentence in `auth.md` corrected.
4. **`client/vite.config.ts` proxied `/auth` to the Worker** — unlisted in both
   this issue and `auth.md`. Removed, along with `/auth/*` from
   `run_worker_first` in `server/wrangler.jsonc`.
5. **The generated `Env` type carried the secrets.**
   `server/worker-configuration.d.ts` declared `SESSION_JWT_SECRET` and
   `INVITE_CODE`; removed from `server/.dev.vars` and regenerated.
6. **The OpenAPI security scheme described a cookie.** `gen-openapi.ts` declared
   `sessionCookie` as `apiKey`-in-cookie; it now declares `bearerAuth` as
   `http`/`bearer`/`JWT`. The transport is bearer from this commit on even though
   nothing can authenticate yet, so leaving the old scheme would have published a
   contract that was wrong in a way no test could catch.
7. **Odds and ends that referenced the deleted system:**
   `ClientCredentialsSchema` in `domain/model/`, `createClient`'s `invite_code`
   argument and its rationale comment, the `hash-password` and
   `db:seed:credentials:local` scripts in `server/package.json`, and three
   identical route comments claiming a session "outlives the row it names by up to
   thirty days" — true of the 30-day cookie, not of a token.

## Deviations

**`SessionVariables` is renamed, not just moved.** The type lived in the deleted
`lib/session.ts` and six route files imported it, so the import had to change
whatever it was called; it is now `AuthVariables` from `lib/auth.ts`. No handler
body changed, and the context variable is still `clientId` — which is what the
criterion was protecting.

**`app.public.test.ts` keeps two cases this issue's criterion did not allow for**,
both deliberately:

- *The guard's 401.* `requireAuth` is the only new code in this commit, and the
  case asserting a blanket 401 inside the error envelope needed no session to
  begin with — so it survives unadapted rather than being deleted and restored.
  Shipping new code with no coverage when a passing test already exists is worse
  than the small inconsistency.
- *`/ingest` strips credentials.* Restated for the `Authorization` header instead
  of deleted. The proxy already stripped both headers by name and never read
  either value, so a synthetic token pins the same guarantee with no source
  change. This is what issue 012's inventory asked for, done a commit early,
  which keeps the coverage continuous instead of leaving a gap.

## Blocked by

None - can start immediately.

## User stories addressed

- User stories 8, 12, 25, 34, 35

## STATUS

DONE
