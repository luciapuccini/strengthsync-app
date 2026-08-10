# Final verification gate

**STATUS: TODO**

## Parent PRD

`issues/prd-monorepo-simplification.md` — see User stories 14 and 15, Testing Decisions: "Verification gate before merge", and Further Notes.

## What to build

Run the full existing toolchain over the restructured monorepo and prove the two-service restructure is merge-safe. This is a verification slice, not a code slice: the expected output is a green run, plus tracing any failure back to the owning slice (008–014) and fixing it there rather than papering over it here.

Verification steps:

1. Clean install from scratch: fresh checkout or equivalent (`git clean`-level clean of `node_modules`, `.turbo`, dist output), `pnpm install --frozen-lockfile` — confirms the lockfile matches the final workspace set (`apps/client`, `apps/server`, `packages/api-contract`) with no `services/*` remnants
2. `pnpm lint` — zero errors, including the internal server boundary rules (`src/domain` purity, `src/db` direction) and the client-only-contract rule
3. `pnpm typecheck` — `tsc -b` across the final project references
4. `pnpm test` — the full suite in its final locations: UI (client), API routes + domain + db repositories (server), and any contract-package checks
5. Contract drift check: regenerate `openapi.d.ts` and confirm zero diff; confirm CI runs this check
6. `pnpm build` — turbo builds the client before the server; the server build (wrangler dry-run) succeeds
7. Worker dry-run deploy: `pnpm --filter @strengthsync/server exec wrangler deploy --dry-run`
8. Local lifecycle smoke against a fresh local D1: `db:migrate:local`, `db:seed:local`, `db:seed:demo:local` from the new server-local paths; `wrangler dev` + vite dev; tracker loads, save day works, complete-week triggers a workflow instance, history renders
9. Reference sweeps (excluding `node_modules`, `.git`, `dist`, `.turbo`, and allowed historical records in `issues/`, `docs/bug-reports/`, `docs/architecture/DDS/`):
   - `grep -rn "@strengthsync/domain\|@strengthsync/db" .` → only historical hits
   - `grep -rn "@strengthsync/ui\|@strengthsync/api" .` → only historical hits (note: `@strengthsync/api-contract` is expected; craft the pattern to exclude it)
   - `grep -rn "services/domain\|services/db" .` → only historical hits
   - `grep -rn "apps/ui\|apps/api" .` → only historical hits
   - Confirm `services/` does not exist
10. Deployment-safety audit (sensitive — do explicitly, not by inference):
    - wrangler `name` is `strengthsync-api` (unchanged)
    - D1 `database_name`/`database_id` unchanged; `migrations_dir` resolves to the moved migrations (verify by dry-run output or `wrangler d1 migrations list --local`)
    - `assets.directory` resolves to `apps/client/dist` and that directory is what `pnpm --filter @strengthsync/client build` produces
    - Workflow `name`/`binding`/`class_name` unchanged and `StrengthsyncWorkflow` is still exported from the server entrypoint
    - No env var or secret was renamed anywhere (`.dev.vars`, CI, docs examples)

## Acceptance criteria

- [ ] Clean install passes and `pnpm-lock.yaml` contains no `@strengthsync/domain` / `@strengthsync/db` / `@strengthsync/ui` / `@strengthsync/api` (non-contract) entries
- [ ] Lint, typecheck, and the full test suite pass from the repo root
- [ ] OpenAPI drift check passes locally and is wired in CI
- [ ] Full build passes with correct turbo ordering; Worker dry-run deploy succeeds
- [ ] Local lifecycle smoke (migrate/seed/dev/tracker/save/complete-week) passes
- [ ] All reference sweeps return only allowed historical hits; `services/` is gone
- [ ] The deployment-safety audit confirms Worker name, D1 ids, asset path resolution, and workflow binding are all correct
- [ ] Any regression discovered is traced back to its owning slice (008–014) and fixed there, not papered over in this slice

## Blocked by

- Blocked by `issues/008-create-api-contract-package.md`
- Blocked by `issues/009-expand-openapi-spec-to-full-public-api.md`
- Blocked by `issues/010-migrate-ui-to-openapi-fetch.md`
- Blocked by `issues/011-move-domain-into-api-app.md`
- Blocked by `issues/012-move-db-into-api-app.md`
- Blocked by `issues/013-rename-apps-to-client-and-server.md`
- Blocked by `issues/014-update-docs-two-service-monolith.md`

## User stories addressed

- User story 14
- User story 15
