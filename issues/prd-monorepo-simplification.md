# PRD: Simplify the monorepo to a two-service monolith (client + server) with an OpenAPI contract

## Problem Statement

The repo is a four-workspace monorepo (`apps/ui`, `apps/api`, `services/domain`, `services/db`) whose package boundaries no longer match how the system is deployed or reasoned about:

- `services/db` has exactly one consumer: `apps/api` (the only runtime with the D1 binding). Maintaining it as a separate workspace buys nothing — it adds a package.json, tsconfig, vitest config, project reference, and eslint boundary rule per change that touches persistence.
- `services/domain` has two consumers with very different needs: `apps/api` (coach rules, prompts, LLM DTOs, model schemas) and `apps/ui` (model types and a handful of Zod schemas for response/draft parsing). The UI dependency couples browser code to server-side business language and forces the domain package to stay browser-safe forever.
- The HTTP contract is split across two mechanisms. `services/domain/contracts` holds Zod DTOs that the UI's hand-rolled fetch wrappers (`apps/ui/src/api/client.ts` and friends) validate at runtime, while a separate OpenAPI document (`services/domain/src/contracts/openapi.json`) describes only the `/wf/complete-week` trigger and feeds `openapi-fetch` in exactly one place (`apps/ui/src/api/cf-api/workflows-api.ts`). Every route change today risks drift between `docs/architecture/api_contracts.md`, the Zod DTOs, the Hono handlers, and the UI wrappers — four places, no single source of truth.
- The app names (`ui`, `api`) and the `services/*` layout describe an architecture we no longer want. The target is a simpler monolith: two runtime services — a **client** and a **server** — whose only shared artifact is a fully typed OpenAPI contract.

## Solution

Restructure the monorepo into two apps plus one contract package:

```text
apps/
  client/        # React/Vite browser app (today: apps/ui)
  server/        # Hono Cloudflare Worker monolith (today: apps/api + services/*)
    src/
      routes/    # public HTTP routes (unchanged behavior)
      domain/    # moved from services/domain: model, coach, server-side DTOs
      db/        # moved from services/db: schema, repositories, drizzle migrations, seeds
      workflows/ # Cloudflare Workflow entrypoints (already here)
      agent/     # in-Worker LLM helpers (already here)
packages/
  api-contract/  # openapi.json (all public routes) + generated openapi.d.ts; no runtime code
```

The OpenAPI document becomes the single source of truth for the HTTP boundary, **spec-first**: `packages/api-contract/openapi.json` is hand-maintained (transcribed from `docs/architecture/api_contracts.md`), `openapi-typescript` generates `openapi.d.ts`, and a CI drift check fails if the committed generated file is stale. The client consumes **all** API routes through `openapi-fetch` against the generated `paths` type, drops its `@strengthsync/domain` dependency entirely, and drops runtime response validation (the server validates; the generated types are the contract). The one exception is UI-local state: corrupted localStorage week drafts must still be safely ignored, so the UI keeps a small UI-owned Zod schema for draft parsing only.

The server absorbs `services/domain` and `services/db` as plain source folders (`apps/server/src/domain`, `apps/server/src/db`) with an eslint boundary that keeps them importable only from inside the server app. Migrations, seeds, and the drizzle config move with the db module; the wrangler `migrations_dir` and package.json seed scripts are repointed. No HTTP route behavior, response shape, workflow logic, prompt, or retry policy changes. The deployed Worker name (`strengthsync-api`), the D1 database, and the workflow binding are untouched — the app rename (`apps/api` → `apps/server`, `apps/ui` → `apps/client`) is a repository-level rename only.

## User Stories

1. As the developer, I want a single OpenAPI document describing every public route (`/api/*` and `/wf/*`), so the HTTP contract has one source of truth instead of four.
2. As the developer, I want TypeScript types generated from the spec in a dedicated contract package, so both apps consume the same `paths`/`components` types and drift is a compile error.
3. As the developer, I want the client to call the API exclusively through `openapi-fetch`, so hand-rolled fetch wrappers and their duplicate Zod DTOs disappear.
4. As the developer, I want the client to depend only on the contract package (never on server domain/db code), so the browser bundle can never accidentally import server-only logic.
5. As the developer, I want the domain module to live inside the server app, so pure business logic lives with its only remaining consumer and stops pretending to be a shared package.
6. As the developer, I want the db module (schema, repositories, drizzle migrations, seeds, testing helpers) to live inside the server app, so persistence lives with the only runtime that holds the D1 binding.
7. As the developer, I want the workflow and agent code to stay inside the server app, so the Worker remains one deployable unit where routes and workflow steps share repositories directly.
8. As the developer, I want the apps renamed `client` and `server` (including package names), so the repo layout matches how we talk about the system — without renaming the deployed Worker or D1 database.
9. As the developer, I want CI to fail when `openapi.json` and the committed `openapi.d.ts` drift, so the contract stays honest without manual policing.
10. As the developer, I want workspace globs, project references, eslint boundaries, turbo tasks, and CI filters updated as packages move, so tooling always reflects the repo as it is.
11. As the developer, I want the architecture docs rewritten for the two-service monolith, so future-me and AI agents are not misled by the retired four-workspace layout.
12. As the coach using the tracker, I want week tracking, history, client management, and "Complete week" to behave exactly as before, so the restructure is invisible to the product.
13. As the developer, I want corrupted localStorage week drafts to keep being safely ignored after the UI drops the domain Zod schemas, so draft handling doesn't regress.
14. As the developer, I want each step of the restructure independently revertable (contract first, then client migration, then module moves, then renames), so a problem late in the sweep never strands the repo in a half-moved state.
15. As the developer, I want the restructure verified with the full existing toolchain (clean install, lint, typecheck, tests, Worker dry-run deploy, reference sweeps), so the merge is provably safe.

## Implementation Decisions

- **Spec-first contract.** `packages/api-contract` owns `openapi.json` (source of truth, transcribed from `docs/architecture/api_contracts.md`) and the generated `openapi.d.ts`. It contains no runtime code and depends on nothing except the `openapi-typescript` dev tool. Both apps import only its generated types. Code-first generation (`@hono/zod-openapi`) is explicitly not adopted in this pass; the server keeps validating with its own Zod DTOs (moved to `apps/server/src/domain/contracts`) and a CI drift check keeps the spec and generated types in sync.
- **Client consumes only the contract.** All UI API calls go through one `openapi-fetch` client created from `paths`. The hand-rolled wrappers (`api/client.ts`, `api/weekResource.ts`, `api/historyResource.ts`, `api/dayLog.ts`, `api/cf-api/*`) are replaced by thin typed wrappers over `openapi-fetch` operations. All `@strengthsync/domain` imports in the UI are replaced by `components["schemas"][...]` types. Runtime response validation in the UI is dropped (the server already validates inbound bodies and owns the response shapes; `openapi-fetch` types are the client-side contract). UI-local state is the exception: localStorage week-draft parsing keeps a small UI-owned Zod schema so corrupt drafts are still ignored instead of crashing the tracker (user story 13).
- **Server absorbs the services as folders, not packages.** `services/domain` → `apps/server/src/domain` (model, coach, contracts) and `services/db` → `apps/server/src/db` (schema, repositories, drizzle migrations, seeds, testing helpers, drizzle config, vitest config). Cross-imports inside the server become relative imports. An eslint boundary rule keeps `src/domain` and `src/db` importable only from within the server app, and keeps `src/domain` free of db/framework imports — the dependency direction `db → domain`, `routes/workflows → db/domain` is preserved, just without package ceremony.
- **No behavior changes.** HTTP routes, response shapes, auth posture, workflow logic, prompts, retry policy, D1 schema, and migrations are all unchanged. Every existing test suite must stay green; tests move with their modules (db repository tests → server, domain tests → server) and are updated only for import paths.
- **Rename last, repository-only.** `apps/ui` → `apps/client` and `apps/api` → `apps/server` happen after the content moves, as a near-pure `git mv` plus package-name/config updates (`@strengthsync/ui` → `@strengthsync/client`, `@strengthsync/api` → `@strengthsync/server`). The wrangler `name` (`strengthsync-api`), the D1 `database_name`/`database_id`, and the workflow binding/class names are NOT renamed — the deployed infrastructure is untouched. The wrangler `assets.directory` (`../ui/dist` → `../client/dist`) and `migrations_dir` paths are repointed.
- **Ordering for revertability.** Contract package first (additive), then spec expansion (contract-only), then the client migration (client-only), then the server-side moves (server-only), then renames, then docs, then verification. Each slice leaves the repo green and is independently revertable (user story 14).

## Testing Decisions

- **No new test infrastructure.** The existing suites (UI store/routes, API public routes, db repositories, domain model/coach/contracts) must stay green; tests move with their code and are updated only for import paths and, in the UI, for the new openapi-fetch-based API layer.
- **UI client tests change shape, not coverage.** Tests that asserted Zod rejection of malformed API responses are removed (that responsibility is the server's); tests around error mapping (`ApiError` → UI error), request shapes, and draft-storage corruption handling are kept and rewritten against the new client module.
- **Contract drift check.** A script runs `openapi-typescript` regeneration and fails CI if `openapi.d.ts` differs from the committed file; the spec is also parsed/validated as part of generation (invalid specs fail the generator). No new runtime validation tooling is introduced.
- **Workflow testing remains deferred**, per the existing standing decision; the Cloudflare Workflow runtime is not exercised in the test suite.
- **Verification gate before merge:** clean install, lint, typecheck, full test suite, Worker dry-run deploy, and reference sweeps for retired names (`@strengthsync/db`, `@strengthsync/domain`, `services/`, old app paths) must all pass.

## Out of Scope

- Any change to HTTP route behavior, request/response shapes, authentication, or error codes beyond transcribing the existing contract into OpenAPI.
- Code-first OpenAPI generation (`@hono/zod-openapi`, `zod-to-openapi`, runtime spec serving such as `/openapi.json` endpoints).
- Renaming the deployed Cloudflare Worker (`strengthsync-api`), the D1 database, the workflow binding/class, or any secret/env var.
- Testing the Cloudflare Workflow in any form (still deferred).
- Streaming chat (still deferred per `docs/architecture/api_contracts.md`).
- Server-side route handlers being mechanically type-checked against the generated `paths` type (nice-to-have; the compile-time guarantee in this pass comes from the client side plus the drift check).
- Rewriting history: existing `issues/001`–`007` and `issues/prd.md` (Temporal retirement) are left untouched as the project record.

## Further Notes

- The wrangler `assets.directory` currently points at `../ui/dist`; the app rename must update it or the deployed Worker serves stale assets. This is the single most deployment-sensitive line in the rename slice.
- `apps/api/tsconfig.json` enables `types: ["node"]` only because tests import `@strengthsync/db/testing` (better-sqlite3); after the db move this stays true (same tests, same helper, new relative path) — the comment must be updated, not the setting.
- `turbo.json` has an explicit `@strengthsync/api#build` dependency on `@strengthsync/ui#build` (the Worker serves the built UI assets); the rename slice must update both names.
- `pnpm-workspace.yaml` drops `services/*` and gains `packages/*`; the lockfile is regenerated after the package deletions.
- Local dev seed scripts in the api package reference `../../services/db/seeds/*.sql`; they move to server-local paths in the db-move slice.
