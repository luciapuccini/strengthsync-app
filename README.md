# StrengthSync

StrengthSync helps a self-coached athlete — or a coach with a small caseload — turn weekly training results into an adapted next week, and at the end of a block into a new plan. Have your tracking app automatized your training progression.

## Tech stack


| Layer     | Choice                                                                 |
| --------- | ---------------------------------------------------------------------- |
| Monorepo  | pnpm workspaces + Turborepo; TypeScript; Node 22.14                    |
| UI        | React 19 + Vite + React Router + Zustand + Tailwind (`client`)         |
| API       | Hono on Cloudflare Workers; serves the SPA in production (`server`)    |
| DB        | Cloudflare D1 + Drizzle ORM (`server/db`)                              |
| Workflows | Cloudflare Workflows, in-Worker with `server` (`StrengthsyncWorkflow`) |
| LLM       | OpenAI via Vercel AI SDK                                               |
| Auth      | Auth0 hosted login; the API verifies a bearer token on `/api/*`        |
| CI        | GitHub Actions; Lefthook pre-commit                                    |


See [docs/architecture/stack.md](docs/architecture/stack.md) for decisions and boundaries.

## Purpose and user flows

### Sign in

Sign in on the Auth0 hosted page with email and password, Apple, or Google, and
you land on your own tracker. Public sign-up is off: the operator creates each
athlete in Auth0 (see
[docs/operations/onboard_beta_user.md](docs/operations/onboard_beta_user.md)).
The API reads whose data to serve from the verified token rather than from the
URL — no screen asks you to pick an athlete, and no request can name one. See
[docs/architecture/auth.md](docs/architecture/auth.md).

### Week tracker

On the tracker, browse the in-flight week by day.
See prescribed sets, reps, rest, and weight for each exercise.

### Set logging

Log performed reps and optional weight per set as you train.
The week becomes a concrete performance log.

### Skip and feedback

Mark an exercise skipped, or tag it easy / hard / heavy / light.
Progression uses these constrained signals instead of free-form notes.

### Complete week

When the week is done, tap **Complete week**.
A Cloudflare Workflow freezes the log, analyzes it against the plan and profile, then creates the next adjusted week — or, at the end of the block, generates and activates a new plan.

## How to run

### Preconditions

- Node `22.14` (see `.nvmrc`; engines `>=22.14 <23`)
- pnpm `11.1.2` (see `packageManager` in root `package.json`)
- Wrangler (via the workspace) for the API Worker

### Secrets

Copy the example file and fill in values:


| Copy from                                            | Copy to             | Used by                                         |
| ---------------------------------------------------- | ------------------- | ----------------------------------------------- |
| [server/.dev.vars.example](server/.dev.vars.example) | `server/.dev.vars`  | API Worker: `OPENAI_*`, `AUTH0_M2M_CLIENT_SECRET` |
| [client/.env.example](client/.env.example)           | `client/.env.local` | Client: `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`   |


`AUTH0_M2M_CLIENT_SECRET` lets the Worker read a new athlete from the Auth0
Management API the first time they sign in (see
[docs/architecture/auth.md](docs/architecture/auth.md)).

`VITE_POSTHOG_KEY` is the PostHog project key for the funnel events in
`docs/mvp.md` §5 (`client/src/lib/analytics.ts`). Leaving it unset makes
analytics no-op rather than erroring, so it is optional for local dev. Vite
inlines it at build time, so production reads it from the `VITE_POSTHOG_KEY`
GitHub secret in CI, not from a Worker secret. `VITE_POSTHOG_HOST` is optional
and defaults to `/ingest`, the Worker's PostHog proxy.

### Getting started

```bash
pnpm install

pnpm --filter @strengthsync/server db:migrate:local
pnpm --filter @strengthsync/server db:seed:local
```

`db:seed:local` applies the coach, demo and history seeds in order. The demo
weeks are anchored to today, so the in-flight week never expires.

To sign in locally as the seeded demo athlete, who owns the only plan and history
in the repository, also bind them to their Auth0 user:

```bash
pnpm --filter @strengthsync/server db:seed:identity:local
```
then 
```bash
pnpm turbo dev
```

Then either register a new account at `/sign-up`, or sign in as the seeded demo
athlete, who owns the only plan and history in the repository:


| Email               | Password           |
| ------------------- | ------------------ |
| `lucia@example.com` | `dev-password-123` |


### Seeding production

There is no `:remote` counterpart to any local seed command — seeding production
is a deliberate manual step, not something a package script can trigger by
accident:

```bash
pnpm --filter @strengthsync/server db:migrate:remote
wrangler d1 execute strengthsync --remote --file ./server/db/seeds/000_default_coach.sql
```

Only the coach row belongs in production. The demo, history and identity seeds
exist to make a freshly migrated local database usable by hand. Never apply
them to production D1.

## Troubleshoot


| Symptom                                     | What to check                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| Plan generation / complete week fails       | Missing `OPENAI_API_KEY`; D1 migrations not applied                            |
| `GET /health` looks fine but workflows fail | Health only proves the Worker — check `wrangler logs` for workflow-step errors |
| Pre-commit slow or failing                  | Lefthook runs full typecheck / lint / test — fix those locally first           |


---

### Working with this repo

**Local Cloudflare dashboard**
http:/localhost:8787/cdn-cgi/explorer