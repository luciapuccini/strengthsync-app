# StrengthSync

StrengthSync helps a self-coached athlete — or a coach with a small caseload — turn weekly training results into an adapted next week, and at the end of a block into a new plan.

MVP access is one shared HTTP Basic Auth coach credential. It is not per-user identity.

## Tech stack

| Layer     | Choice                                                                             |
| --------- | ---------------------------------------------------------------------------------- |
| Monorepo  | pnpm workspaces + Turborepo; TypeScript; Node 22.14                                |
| UI        | React 19 + Vite + React Router + Zustand + Tailwind (`apps/ui`)                    |
| API       | Hono on Cloudflare Workers; serves the SPA in production (`apps/api`)              |
| DB        | Cloudflare D1 + Drizzle ORM (`services/db`)                                        |
| Workflows | Cloudflare Workflows, in-Worker with `apps/api` (`StrengthsyncWorkflow`)          |
| LLM       | OpenAI via Vercel AI SDK; Braintrust for tracing/evals                             |
| Auth      | HTTP Basic Auth (shared coach credential)                                          |
| CI        | GitHub Actions; Lefthook pre-commit                                                |

See [docs/architecture/stack.md](docs/architecture/stack.md) for decisions and boundaries.

## Purpose and user flows

### Clients

Open **Clients**, create or pick an athlete, and open their tracker.
One shared coach login covers the whole caseload in MVP.

### Generate plan

With no active week, tap **Generate plan**.
The app builds a multi-week block from client context and coaching rules, activates it, and opens week 1.

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
A workflow freezes the log, analyzes it against the plan and profile, then creates the next adjusted week — or signals that the block is finished.

### New plan at block end

When the plan is complete (or you want a fresh block), **Generate plan** again.
History and profile are summarized, the old plan is archived, and a new block with week 1 is activated.

## How to run

### Preconditions

- Node `22.14` (see `.nvmrc`; engines `>=22.14 <23`)
- pnpm `11.1.2` (see `packageManager` in root `package.json`)
- Wrangler (via the workspace) for the API Worker
- For workflows: Temporal CLI for local `temporal server start-dev`, or Temporal Cloud credentials
- Optional: Docker Desktop for Compose-based workflows

### Secrets

Copy the example files and fill in values. Generate service secrets with:

```bash
openssl rand -base64 32
```

| Copy from                                                | Copy to                 | Used by                                                                                                            |
| -------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [apps/api/.dev.vars.example](apps/api/.dev.vars.example) | `apps/api/.dev.vars`    | API Worker: `BASIC_AUTH_*`, `INTERNAL_API_SERVICE_SECRET`; optional `WORKFLOW_API_URL` / `WORKFLOW_SERVICE_SECRET` |
| [.dev.vars.example](.dev.vars.example)                   | `.dev.vars` (repo root) | Workflows: `WORKFLOW_SERVICE_SECRET`, `INTERNAL_API_*`, `OPENAI_*`; optional Temporal / Braintrust                 |
| [.env.workflows.example](.env.workflows.example)         | `.env.workflows`        | Docker Compose workflows only                                                                                      |

`INTERNAL_API_SERVICE_SECRET` in `apps/api/.dev.vars` and root `.dev.vars` must match when the worker calls `/internal/*`.

### Getting started

```bash
pnpm install

pnpm --filter @strengthsync/api db:migrate:local
pnpm --filter @strengthsync/api db:seed:local
# optional demo data:
# pnpm --filter @strengthsync/api db:seed:demo:local
```

There is no unified root `dev`. Run these side by side:

```bash
pnpm --filter @strengthsync/api dev             # Worker on :8787
pnpm --filter @strengthsync/ui dev              # Vite; proxies /api,/health → :8787
pnpm --filter @strengthsync/workflows dev:api   # needed for plan gen / complete week
pnpm --filter @strengthsync/workflows dev:worker
```

Unset `TEMPORAL_*` in root `.dev.vars` to use a local Temporal dev server (`temporal server start-dev`). Set all three (`TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`, `TEMPORAL_API_KEY`) for Temporal Cloud.

Optional Docker workflows (prod-like local stack):

```bash
docker compose -f docker-compose.workflows.yml up -d --build
docker compose -f docker-compose.workflows.yml down
```

Deeper runbooks: [docs/operations/local_worker.md](docs/operations/local_worker.md), [docs/architecture/stack.md](docs/architecture/stack.md).

## Troubleshoot

| Symptom                                     | What to check                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Workflow routes return **503**              | `WORKFLOW_API_URL` unset in `apps/api/.dev.vars`, or workflow `dev:api` / Compose not running  |
| Internal or workflow auth failures          | `INTERNAL_API_SERVICE_SECRET` or `WORKFLOW_SERVICE_SECRET` mismatch between API and workflows  |
| Plan generation / complete week fails       | Workflows `dev:api` + `dev:worker` not running; Temporal unavailable; missing `OPENAI_API_KEY` |
| `GET /health` looks fine but workflows fail | Health only proves the Worker — not tunnel, Temporal, or the local worker                      |
| Worker cannot reach D1 from Node            | Expected: the workflow worker must call `/internal/*` on the API; it has no D1 binding         |
| Pre-commit slow or failing                  | Lefthook runs full typecheck / lint / test — fix those locally first                           |
| Compose containers stop and stay down       | Compose uses `restart: "no"`; start the stack manually when you need workflows                 |

---

### Working with this repo

_Local Cloudflare dashboard_
http:/localhost:8787/cdn-cgi/explorer
