# Checkpoint: Monorepo scaffold (Milestone 1)

**Date:** 2026-07-21
**Status:** Complete — committed as `796f2a9 chore: scaffold monorepo workspace`
**Roadmap ref:** `docs/mvp_scope.md` → Delivery sequence, item 1 (first half)

## What exists now

- Fresh pnpm workspace at `/Users/luciapuccini/Dev/strengthsync-app` with the six packages from `docs/architecture/monorepo_structure.md`:
  - `apps/ui`, `apps/api`, `apps/workflows`
  - `services/domain`, `services/agent`, `services/db`
- Root tooling: TypeScript project references (strict `tsconfig.base.json`, composite declaration emit), ESLint flat config with per-package import-boundary rules, vitest root runner (one project per package), lefthook pre-commit guard, GitHub Actions CI (`.github/workflows/ci.yml`).
- Placeholder modules that make every allowed dependency edge compile for real: ui→domain, api→{domain, agent, db}, workflows→{domain, agent}, agent→domain, db→domain. `services/domain` imports nothing.
- `services/domain` placeholders: core unions (`DayType`, statuses, `ExerciseFeedback`), `ApiError`, `WorkflowLlmStep`.
- `services/agent` placeholder: `LlmCallRecorder` interface verbatim from `monorepo_structure.md`, plus `WorkflowLlmContext`.
- `docs/` copied from the POC repo; **this repo is now the source of truth for MVP docs**.

## Verification

- `pnpm typecheck` (`tsc -b`, project references) — green
- `pnpm lint` — green
- `pnpm test` — 6 files / 9 tests green
- ESLint boundaries negative-tested in both directions (ui→db and domain→agent correctly rejected)
- Pre-commit hook negative-tested: a commit containing a type error was rejected by lefthook (typecheck failed, lint/test passed); the valid scaffold commit passed the hook.

## Decisions

- Node `22.14.0` via `.nvmrc` + `engines`; pnpm `11.1.2` via `packageManager`. **Note:** the scaffold machine currently runs Node 24 with no `nvm` installed — checks ran fine on Node 24, but contributors should `nvm use` (or install Node 22.14.0) per `implementation_preferences.md`.
- Exact devDependency versions per `implementation_preferences.md`, matching the POC's proven toolchain: typescript 6.0.2, vitest 4.1.10, eslint 10.6.0, @eslint/js 10.0.1, typescript-eslint 8.62.0, globals 17.7.0, @cloudflare/workers-types 4.20260702.1 (POC's resolved version), @types/node 22.20.1 (matches Node 22), lefthook 2.1.10.
- Zero runtime dependencies outside workspace links; React/Hono/Temporal/Drizzle/Zod are deferred to their own milestones.
- Package `exports` point at TS sources (internal-package pattern); `tsc -b` with composite references enforces build order; deep imports are structurally blocked by `exports` maps.
- lefthook chosen for the pre-commit guard (parallel typecheck + lint + test, per `implementation_preferences.md`).

## Dependency scores

Socket CLI (depscore) could not score packages: the configured Socket API token is expired/invalid (`Unauthorized` from `api.socket.dev`). All nine dependencies are mainstream toolchain packages pinned to exact versions matching the POC lockfile.
**Action:** refresh the Socket token, then re-run `socket package score npm <pkg>@<version>` for the dependency list above.

## Deliberately out of scope (later milestones)

- No runtime apps yet: React/Vite UI, Hono Worker, Temporal worker.
- `apps/workflows` subdirectories (`activities/`, `workflows/`, `observability/`, `evals/`) land with the workflow-runtime milestone.
- No `.dev.vars.example` yet (arrives with the API milestone, once secrets exist).
- No `CLAUDE.md`/`AGENTS.md` port from the POC repo.

## Next milestone

Remainder of roadmap item 1:

1. D1 schema + Drizzle in `services/db` — `Coach`, `Client`, `ClientProfile`, `Plan`, `Week` per `docs/architecture/domain_model.md`, with Zod schemas for the `week_template`/`schedule` JSON columns in `services/domain`.
2. Internal `/internal/*` data-command boundary in `apps/api` per `docs/architecture/api_contracts.md`.
3. Local workflow runtime: `docker-compose.workflows.yml` (workflow-api + temporal-worker + cloudflared) per `docs/operations/local_worker.md`.
