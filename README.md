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
| Auth      | Client accounts: hashed passwords + a signed session cookie            |
| CI        | GitHub Actions; Lefthook pre-commit                                    |


See [docs/architecture/stack.md](docs/architecture/stack.md) for decisions and boundaries.

## Purpose and user flows

### Sign up and sign in

Register with a name, email and password, and you land on your own tracker.
Every athlete has their own account, and the API reads whose data to serve from
the session cookie rather than from the URL — no screen asks you to pick an
athlete, and no request can name one. Social sign-in is not built: the Apple and
Google buttons render disabled and say so.

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
| [server/.dev.vars.example](server/.dev.vars.example) | `server/.dev.vars`  | API Worker: `OPENAI_*`                          |
| [client/.env.example](client/.env.example)           | `client/.env.local` | Client: `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` |


`VITE_POSTHOG_KEY` is the PostHog project key for the funnel events in
`docs/mvp.md` §5 (`client/src/lib/analytics.ts`). Leaving it unset makes
analytics no-op rather than erroring, so it is optional for local dev.

### Getting started

```bash
pnpm install

pnpm --filter @strengthsync/server db:migrate:local
pnpm --filter @strengthsync/server db:seed:local
```

`db:seed:local` applies the coach, demo, history and credential seeds in order —
one command, not four.

```bash
pnpm turbo dev
```

Then either register a new account at `/sign-up`, or sign in as the seeded demo
athlete, who owns the only plan and history in the repository:


| Email               | Password           |
| ------------------- | ------------------ |
| `lucia@example.com` | `dev-password-123` |


That credential is committed on purpose, in `server/db/seeds/003_demo_credentials.sql`.
It is safe only because no command in this repository can apply that seed to
production — see below.

### Seeding production

There is no `:remote` counterpart to any local seed command — seeding production
is a deliberate manual step, not something a package script can trigger by
accident:

```bash
pnpm --filter @strengthsync/server db:migrate:remote
wrangler d1 execute strengthsync --remote --file ./server/db/seeds/000_default_coach.sql
```

Only the coach row belongs in production. The demo, history and credential
seeds exist to make a freshly migrated local database usable by hand — the
credential seed in particular commits a real password hash, which is safe
only because nothing in the package manifest can push it to production.

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