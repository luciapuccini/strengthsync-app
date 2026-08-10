# Move services/domain into the API app as src/domain

**STATUS: TODO**

## Parent PRD

`issues/prd-monorepo-simplification.md` — see Implementation Decisions: "Server absorbs the services as folders, not packages" and User story 5.

## What to build

Dissolve the `@strengthsync/domain` workspace package and move its source into `apps/api/src/domain/`. After this slice the domain is ordinary server source code: the API routes, workflow, and agent import it via relative paths, its tests run in the API package's suite, and nothing outside `apps/api` can import it. Only possible because the UI dropped its domain dependency in `issues/010-migrate-ui-to-openapi-fetch.md`.

Moves (preserve git history with `git mv`):

- `services/domain/src/model/` → `apps/api/src/domain/model/` (including `model.test.ts`)
- `services/domain/src/coach/` → `apps/api/src/domain/coach/` (`weekly-progression.ts`, `plan-generation.ts`, `coaching-rules.ts`, `index.ts`)
- `services/domain/src/contracts/index.ts` → `apps/api/src/domain/contracts/index.ts` (server-side Zod DTOs; `contracts.test.ts` moves with it)
- Delete `services/domain/` entirely: `package.json`, `tsconfig.json`, any vitest config, `node_modules` symlink remnants. (The openapi files already left in `issues/008-create-api-contract-package.md`.)

Import updates (package import → relative import), in `apps/api/src`:

- `@strengthsync/domain/model` → relative `../domain/model/index.js`-style path per the app's existing import convention (the app currently uses `.ts` extensioned relative imports like `./lib/errors.ts` — follow that convention)
- `@strengthsync/domain/coach` → relative path
- `@strengthsync/domain/contracts` → relative path
- Known consumers to update (grep for `@strengthsync/domain` under `apps/api` and `services/db`): `apps/api/src/routes/*.ts`, `apps/api/src/workflows/strengthsync-workflow.ts`, `apps/api/src/workflows/plan-turnover.ts`, `apps/api/src/lib/validate.ts`, `apps/api/src/app.public.test.ts`, `apps/api/src/testkit.ts`, and all of `services/db/src/**` (`schema.ts`, `repositories/*`, `dates.ts`, tests) — the db package still exists as a workspace in this slice and must import the domain via its new location. Two options, pick one and state it in the PR:
  1. **Preferred:** do this slice together with a temporary boundary exception — `services/db` imports `apps/api/src/domain` via a relative path (`../../apps/api/src/domain/...`), explicitly allowed by a temporary eslint exception, removed in `issues/012-move-db-into-api-app.md` when db follows into the app. Document the exception with a TODO comment referencing issue 012.
  2. Alternative: reorder — move db first. Do NOT silently choose this; the ordering in this issue exists so only one temporary cross-boundary hack ever exists.

Config updates:

- Root `tsconfig.json`: remove the `./services/domain` reference
- `apps/api/tsconfig.json`: remove the `../../services/domain` reference (domain sources are now inside `include: ["src"]` — confirm `rootDir: "src"` still holds)
- `services/db/tsconfig.json`: adjust so it can typecheck against the moved domain sources (if using option 1, it may need `include`/path mapping for `../../apps/api/src/domain` or a project reference to `apps/api` — project references across packages require the referenced project to be composite; if that fights the current setup, fall back to path mapping and note the tradeoff)
- `pnpm-workspace.yaml`: leave `services/*` in place (db still exists there); the domain package simply disappears from the glob
- `apps/api/package.json`: add `zod` is already present — verify; remove nothing else. `services/db/package.json`: remove `"@strengthsync/domain": "workspace:*"`
- `eslint.config.js`: remove `'@strengthsync/domain'` from `ALL_WORKSPACES`; remove the old `services/domain` boundary entry; add boundary rules encoding the new internal direction:
  - `apps/api/src/domain/**/*.ts` may not import from `../db/**`, `../routes/**`, `../workflows/**`, `../agent/**` (domain stays pure: zod only)
  - if option 1: temporary exception allowing `services/db` to import the relative domain path, with a TODO referencing issue 012
- Domain tests (`model.test.ts`, `contracts.test.ts`, coach tests if any) run under the API package's `vitest run` — confirm the API's vitest config picks up `src/domain/**` test files
- Regenerate the lockfile (`pnpm install`) to prune the deleted package

Explicitly NOT in this slice: moving `services/db` (next slice), renaming apps, changing any domain logic or schema (pure move — no code edits beyond import paths).

## Acceptance criteria

- [ ] `services/domain/` no longer exists; `grep -r "@strengthsync/domain" --include="*.ts" --include="*.json" apps services packages eslint.config.js tsconfig.json pnpm-workspace.yaml` returns nothing except the documented temporary relative-path exception comments if option 1 was used
- [ ] Domain source lives at `apps/api/src/domain/{model,coach,contracts}` with all tests moved and passing inside the API package's test run
- [ ] `apps/api/src/domain` contains no imports from sibling server folders (db/routes/workflows/agent) — enforced by eslint
- [ ] `services/db` still typechecks and its tests pass (via the temporary mechanism chosen above)
- [ ] `pnpm install` regenerates a clean lockfile with no `@strengthsync/domain` entry
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass from the root; `pnpm --filter @strengthsync/api build` (dry-run deploy) succeeds
- [ ] `git log --follow` on a moved file (e.g. `apps/api/src/domain/model/index.ts`) shows its pre-move history

## Blocked by

- Blocked by `issues/010-migrate-ui-to-openapi-fetch.md`

## User stories addressed

- User story 5
- User story 10 (partial — wiring for this move)
