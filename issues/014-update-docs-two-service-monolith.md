# Update architecture docs for the two-service monolith

**STATUS: TODO**

## Parent PRD

`issues/prd-monorepo-simplification.md` — see User story 11 and Implementation Decisions. Follows the code slices so docs describe the repo as it actually is.

## What to build

Rewrite the architecture documentation so it describes the two-service monolith (client + server + api-contract) and no longer teaches the retired four-workspace layout. The code is already in its final shape when this slice starts; this slice makes the written architecture match it.

Rewrites:

- `docs/architecture/monorepo_structure.md` — full rewrite:
  - New tree: `apps/client`, `apps/server` (with `src/routes`, `src/domain`, `src/db`, `src/workflows`, `src/agent`), `packages/api-contract`
  - New dependency graph: `client → api-contract`, `server → api-contract`; internal server direction `db → domain`, `routes/workflows → db/domain`; nothing imports across apps
  - Per-area ownership sections replacing the current `apps/ui` / `apps/api` / `services/domain` / `services/db` sections, including the "May import / Must not import" lists updated to the new layout
  - Workspace setup section: `pnpm-workspace.yaml` globs (`apps/*`, `packages/*`), root tsconfig references, per-app tsconfigs
  - Enforcement section: eslint boundary rules as they now exist (including the internal server rules), turbo pipeline (client builds before server), the OpenAPI drift check in CI
  - Migration mapping table: old paths → new paths (extend the existing table rather than deleting history)
  - Update the retired-packages note: `services/domain` and `services/db` are now folders inside the server app
- `docs/architecture/api_contracts.md` — keep as the human-readable contract narrative, but state at the top that `packages/api-contract/openapi.json` is the machine-readable source of truth and that the client consumes it via `openapi-fetch`; remove the line saying DTOs belong in `services/domain/contracts` (now `apps/server/src/domain/contracts` and the spec)
- `docs/architecture/stack.md` — update any monorepo layout references to the new app names
- `docs/architecture/turborepo.md` — update package names and the build-order explanation (client → server via assets)
- `docs/operations/ci_cd.md` — update filters/package names and add the OpenAPI drift check to the CI description
- `docs/architecture/evals.md`, `docs/architecture/workflows.md`, `docs/architecture/domain_model.md` — fix stale path references (`services/domain` → `apps/server/src/domain`, `services/db` → `apps/server/src/db`, app renames) without rewriting content
- `README.md` — update quickstart commands, workspace names, and any structure description
- `NOTES.md` — only if it references old paths in a way that would mislead (otherwise leave)

Also add a short `packages/api-contract/README.md` (or a header comment in the package) documenting the contract workflow: edit `openapi.json` → run `gen:openapi` → commit both → CI drift check enforces. State explicitly that the package contains no runtime code.

Rules:

- Do not touch `issues/001`–`007` or `issues/prd.md` (Temporal retirement record) or `docs/bug-reports/` — historical documents stay as they are
- Where a doc describes decisions that were correct at the time (e.g. the four-workspace rationale), replace rather than annotate — docs describe the present, git history preserves the past

## Acceptance criteria

- [ ] `docs/architecture/monorepo_structure.md` describes only the two-service layout and matches the actual repo (tree, dependency graph, boundaries, enforcement)
- [ ] `grep -rn "services/domain\|services/db\|apps/ui\|apps/api\|@strengthsync/ui\|@strengthsync/api\b\|@strengthsync/domain\|@strengthsync/db" docs/ README.md` returns hits only in historical-record contexts (`docs/bug-reports/`, migration-mapping tables, or explicit "formerly" notes)
- [ ] `api_contracts.md` points at `packages/api-contract/openapi.json` as the source of truth
- [ ] The contract package documents its own edit/generate/commit workflow
- [ ] No doc instructs a reader to create or modify `services/*` packages
- [ ] `pnpm lint`, `pnpm typecheck` pass (docs changes shouldn't break these, but confirm no code fences in configs were broken)

## Blocked by

- Blocked by `issues/013-rename-apps-to-client-and-server.md`

## User stories addressed

- User story 11
