# Move services/db into the API app as src/db

**STATUS: TODO**

## Parent PRD

`issues/prd-monorepo-simplification.md` — see Implementation Decisions: "Server absorbs the services as folders, not packages", User stories 6 and 7, and Further Notes (seed scripts, `types: ["node"]` comment).

## What to build

Dissolve the `@strengthsync/db` workspace package and move the entire persistence layer — source, drizzle migrations, seeds, drizzle config, and test helpers — into `apps/api/src/db/` (with migrations/seeds/config at server-local paths). After this slice the `services/` directory is empty and gone, the Worker owns its full persistence lifecycle, and the temporary cross-boundary exception from `issues/011-move-domain-into-api-app.md` is removed. This is the most deployment-sensitive move in the sweep because `wrangler.jsonc` points at the migrations directory and the api package scripts point at seed files — every path must be repointed in the same commit.

Moves (preserve git history with `git mv`):

- `services/db/src/` → `apps/api/src/db/`: `schema.ts`, `db.ts`, `errors.ts`, `dates.ts` (+ `dates.test.ts`), `index.ts`, `repositories/` (all repository files + `repositories.test.ts` + `internal-helpers.ts`), `testing/` (`fake-d1.ts`, `index.ts`)
- `services/db/drizzle/` (generated migrations incl. `meta/`) → `apps/api/src/db/drizzle/` — OR `apps/api/db/drizzle/` if keeping generated SQL out of `src/` reads better; pick one, state it in the PR, and use it consistently below (recommended: `apps/api/db/` for drizzle artifacts, migrations, and seeds, keeping `src/` for TypeScript only)
- `services/db/seeds/` → same chosen location (e.g. `apps/api/db/seeds/`)
- `services/db/drizzle.config.ts` → `apps/api/db/drizzle.config.ts` (or the package root; keep `drizzle-kit generate` working with updated relative paths to the schema file)
- `services/db/vitest.config.ts` → fold into the API package's vitest setup (repository tests must run under `apps/api`'s `vitest run`; check setup files / environment needs of `fake-d1.ts` and better-sqlite3)
- Delete `services/db/` entirely, then delete the now-empty `services/` directory and remove `services/*` from `pnpm-workspace.yaml`

Import updates (package import → relative import) throughout `apps/api/src`:

- `@strengthsync/db` and `@strengthsync/db/testing` → relative paths into `./db/...` (e.g. `app.ts`, `index.ts`, `routes/*.ts`, `workflows/strengthsync-workflow.ts`, `workflows/plan-turnover.ts`, `testkit.ts`, `app.public.test.ts`, `lib/lookup.ts` — grep for the full list)
- The db module's own imports of the domain (currently the temporary mechanism from issue 011) become ordinary relative imports into `../domain/...`
- Remove the temporary eslint exception added in issue 011

Config and script updates (same commit as the move — these break deploy/seed if landed separately):

- `apps/api/wrangler.jsonc`: `d1_databases[0].migrations_dir` — repoint from `../../services/db/drizzle` to the new location (e.g. `./db/drizzle` if artifacts live at `apps/api/db/drizzle`; the path is relative to the wrangler config file)
- `apps/api/package.json` scripts: repoint all `db:seed:*` paths from `../../services/db/seeds/*.sql` to the new seeds location; move `db:generate` (drizzle-kit) into `apps/api/package.json` and verify it runs from the new config path
- Root `tsconfig.json`: remove the `./services/db` reference
- `apps/api/tsconfig.json`: remove the `../../services/db` reference; update the `types: ["node"]` comment (it currently says tests import `@strengthsync/db/testing` — same reason, new relative path)
- `apps/api/package.json`: add `better-sqlite3` + `@types/better-sqlite3` + `drizzle-kit` devDependencies (they came from the deleted package; keep the same versions) — `drizzle-orm` and `zod` are already there; remove `"@strengthsync/db": "workspace:*"`
- `pnpm-workspace.yaml`: remove `services/*` from `packages:`; check `allowBuilds` still covers `better-sqlite3` (it is listed at root already — confirm)
- `eslint.config.js`: remove `'@strengthsync/db'` from `ALL_WORKSPACES` and delete the old `services/db` boundary entry; add internal boundary rules:
  - `apps/api/src/db/**/*.ts` may import from `../domain/**` but not from `../routes/**`, `../workflows/**`, `../agent/**` (db never imports HTTP/workflow/agent code)
  - nothing outside `apps/api` may import `apps/api/src/db` (already implied by app-level rules — state it explicitly if the config structure benefits)
- `scripts/check-dependency-policy.mjs`: verify the catalog policy script doesn't hard-code the deleted package names (update if it does)
- Regenerate the lockfile (`pnpm install`) to prune the deleted package

Local verification of the moved lifecycle (sensitive — do not skip):

- `pnpm --filter @strengthsync/api db:generate` produces no diff (drizzle config still resolves the schema)
- `pnpm --filter @strengthsync/api db:migrate:local` applies cleanly to a fresh local D1
- `pnpm --filter @strengthsync/api db:seed:local` (and demo/history seeds) run from the new paths
- `pnpm --filter @strengthsync/api exec wrangler deploy --dry-run` succeeds with the new `migrations_dir`

Explicitly NOT in this slice: renaming apps, changing any schema/migration/repository logic (pure move — no SQL or code edits beyond import paths and config paths).

## Acceptance criteria

- [ ] `services/` no longer exists; `pnpm-workspace.yaml` lists only `apps/*` and `packages/*`
- [ ] `grep -r "@strengthsync/db" --include="*.ts" --include="*.json" --include="*.jsonc" --include="*.mjs" apps packages scripts eslint.config.js tsconfig.json pnpm-workspace.yaml turbo.json` returns nothing
- [ ] Persistence code lives under the server app; migrations, seeds, and drizzle config live at the chosen server-local location and all four local lifecycle commands above pass
- [ ] The temporary eslint exception from issue 011 is gone; `src/db` cannot import routes/workflows/agent (enforced by eslint)
- [ ] Repository tests, fake-d1 helper, and all existing API tests pass under `apps/api`'s test run
- [ ] `pnpm install` regenerates a clean lockfile with no `@strengthsync/db` entry
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass from the root; dry-run deploy succeeds with the repointed `migrations_dir`
- [ ] `git log --follow` on a moved file (e.g. the schema file at its new path) shows pre-move history

## Blocked by

- Blocked by `issues/011-move-domain-into-api-app.md`

## User stories addressed

- User story 6
- User story 7
- User story 10 (partial — workspace/service wiring completed)
