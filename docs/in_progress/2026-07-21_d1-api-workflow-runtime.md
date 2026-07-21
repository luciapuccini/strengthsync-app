# Checkpoint: D1 schema, API boundary, workflow runtime (Roadmap item 1)

**Date:** 2026-07-21
**Status:** Complete — commits `6b22654` (domain), `b0f1b28` (db), `30a7a9d` (api), `08ca4da` (workflows)
**Roadmap ref:** `docs/mvp_scope.md` → Delivery sequence, item 1 — now fully delivered ("Establish the monorepo, D1 schema, internal API boundary, and local workflow runtime")

## What exists now

- **`services/domain`**: Zod schemas for all five entities + nested plan/week documents (`docs/architecture/domain_model.md`); every public + internal API DTO (`api_contracts.md`); workflow input/output/status DTOs (`workflows.md`); the active coaching-rules document (ported from the POC, already English).
- **`services/db`**: Drizzle/D1 schema (5 tables, JSON `week_template`/`schedule` columns), generated migration (`drizzle/0000_*.sql`), seed (`seeds/000_default_coach.sql` — the single shared coach), and intent-level repositories including the internal workflow commands. Lifecycle commands use D1 `batch()` (never `transaction()`).
- **`apps/api`**: Hono Cloudflare Worker. Public REST behind shared Basic auth; `/internal/*` data commands behind a service secret (SHA-256 digest comparison); async workflow start/status routes proxy through the tunnel and return immediately. `wrangler.jsonc` with the D1 binding (placeholder `database_id` — run `wrangler d1 create strengthsync` before deploying).
- **`apps/workflows`**: Temporal worker + private Hono start API (service secret), one shared Docker image, `docker-compose.workflows.yml` (workflow-api + temporal-worker + cloudflared, `restart: "no"`, no published ports). Workflows are typed **stubs** proving the runtime path; real activities arrive with milestones 4–5.

## Verification

- `pnpm typecheck` / `lint` / `test` — green (12 test files, 67 tests), all commits landed through the lefthook guard.
- Full MVP lifecycle tested through the API boundary against an in-memory D1: activate plan → patch day → complete → next week → complete plan → generate/activate new plan → history retained.
- D1 batch atomicity tested (failed week-1 insert rolls back the plan insert); idempotency by `workflow_id` tested for both create-next-week and activate-generated.
- `wrangler deploy --dry-run` builds the Worker bundle (~140 KiB gzip) with the D1 binding.
- `docker compose -f docker-compose.workflows.yml config` validates; the standalone `pnpm deploy --legacy` install was smoke-tested on the host (health 200, auth 403s).
- Note: a user's stricter ESLint rules (complexity/max-lines) were added mid-milestone and are merged + honored.

## Decisions (not in the docs)

- **`workflow_id` columns** on `plans`/`weeks` as idempotency keys for internal commands (the docs mandate idempotent commands but not the mechanism). Partial unique indexes enforce one active plan / one in_flight week per client.
- **Week convention**: Mon–Sun ISO weeks (matches POC data). Week 1 starts on the Monday of the activation week; subsequent weeks are `start_date + 7`.
- **Seed coach** has deterministic UUID `00000000-0000-4000-8000-000000000001`; applied via `apps/api` script `db:seed:local` (kept out of drizzle migrations).
- **Deterministic workflow ids**: `weekly-progression:{client}:{week}` and `plan-generation:{client}:{date}` + `ALLOW_DUPLICATE_FAILED_ONLY` reuse. Duplicate starts return the running execution; retry only after failure. **Known trade-off**: plan-generation retry loses optional coach notes (input isn't re-derivable from the id); same-day second plan cycle needs the failed/completed execution to be terminated first.
- **Deterministic Drizzle ids**: UUIDv4 via `crypto.randomUUID` (Workers + Node 22 both have it).
- **Repo errors** carry `kind` (`not_found`/`validation`/`conflict`) → API maps to 404/400/409.
- **Tests** run against a better-sqlite3-backed fake D1 (`services/db/src/testing`) implementing the exact drizzle-orm/d1 interface with atomic batch — no miniflare/vitest-pool-workers dependency.
- **workers-types v5** (`5.20260721.1`) to satisfy wrangler 4.112's peer range (POC used v4).
- **Docker image**: `pnpm deploy --legacy` (pnpm v10+ requires it without `inject-workspace-packages`).
- Two secrets files: `apps/api/.dev.vars` (Worker, wrangler) and root `.dev.vars` (local workflow dev) / `.env.workflows` (compose). Examples committed for all three.

## Gotchas hit (for future reference)

- Drizzle column builders bind their name on first use — reuse via a **factory function** (`jsonRecord()`), never a shared instance (silently drops columns).
- `erasableSyntaxOnly` forbids constructor parameter properties.
- Hono `basicAuth` failures are `HTTPException`s — `onError` must pass them through (`err.getResponse()`), not convert to 500.
- `pnpm deploy` (even failed) can dirty workspace `node_modules` state; a plain `CI=true pnpm install` restores it.

## Not done yet (later milestones)

- Real workflow activities + LLM calls (milestones 4–5), Braintrust recorder (`observability/`), evals (`apps/workflows/evals/`), UI (milestones 2–3), chat (deferred per scope).
- `wrangler d1 create` + real `database_id`, Cloudflare Tunnel creation, Temporal Cloud namespace provisioning — all require account access.

## How to run locally today

```bash
# API (terminal 1): local D1 + Worker
pnpm --filter @strengthsync/api db:migrate:local && pnpm --filter @strengthsync/api db:seed:local
pnpm --filter @strengthsync/api dev                       # http://localhost:8787

# Workflows (terminal 2+3): local Temporal dev server
temporal server start-dev                                 # Web UI :8233
pnpm --filter @strengthsync/workflows dev:api             # :3001
pnpm --filter @strengthsync/workflows dev:worker
```

## Next milestone

Roadmap item 2: **client profile with settings and preferences** — the UI milestone (React app in `apps/ui` consuming the public API). Socket token is still expired → depscore scores still pending for everything added since the scaffold.
