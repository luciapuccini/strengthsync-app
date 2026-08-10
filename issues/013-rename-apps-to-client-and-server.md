# Rename the apps to client and server

**STATUS: TODO**

## Parent PRD

`issues/prd-monorepo-simplification.md` — see Implementation Decisions: "Rename last, repository-only" and User story 8. Further Notes calls out the deployment-sensitive asset path.

## What to build

Rename `apps/ui` → `apps/client` and `apps/api` → `apps/server`, including their package names, now that all content moves are done. This is a near-pure mechanical slice: `git mv` plus name/path updates across configs. It is deliberately last among the code slices so every earlier diff stayed in stable paths.

**Hard constraint:** this renames repository paths and pnpm package names only. The deployed infrastructure keeps its names: wrangler `name: "strengthsync-api"` stays, D1 `database_name`/`database_id` stay, the workflow `name`/`binding`/`class_name` stay, and no env var or secret is renamed. Renaming the Worker would create a new deployed Worker and break the assets/D1 bindings — explicitly out of scope.

Renames:

- `git mv apps/ui apps/client`; `git mv apps/api apps/server`
- `apps/client/package.json`: `"name": "@strengthsync/ui"` → `"@strengthsync/client"`
- `apps/server/package.json`: `"name": "@strengthsync/api"` → `"@strengthsync/server"`

Path/name updates (grep each before finishing — the list below is the known set, not necessarily exhaustive):

- `apps/server/wrangler.jsonc`:
  - `assets.directory`: `"../ui/dist"` → `"../client/dist"` (**deployment-sensitive** — if missed, the Worker serves stale/missing assets)
  - keep `name`, `d1_databases`, `workflows` exactly as they are
- `turbo.json`: `@strengthsync/api#build` → `@strengthsync/server#build`, and its dependency `@strengthsync/ui#build` → `@strengthsync/client#build`
- `eslint.config.js`: update `ALL_WORKSPACES` names and every `files` glob (`apps/ui/**` → `apps/client/**`, `apps/api/**` → `apps/server/**`, including the shadcn/react-refresh overrides and the internal `src/domain`/`src/db` boundary rules from issues 011/012)
- Root `tsconfig.json`: update reference paths
- `.github/workflows/`: update any `--filter @strengthsync/ui` / `--filter @strengthsync/api` or path filters to the new names
- Root `package.json` / `scripts/*`: update any hard-coded package names or paths (check `scripts/check-dependency-policy.mjs`, `scripts/ts-metrics.mjs` argument examples)
- `lefthook.yml`: update any path or filter references
- `vitest.config.ts` (root) and per-app configs: update if they reference old paths
- `apps/client/vite.config.*`: update only if it references `../api` or old names (check for dev-proxy config pointing at the API — if a proxy target path changed, update it; do not change ports/behavior)
- Any `import.meta.env.VITE_*` names stay the same (env vars are not renamed)
- README quickstart commands and `docs/` references to `apps/ui`/`apps/api` — update only the mechanically-broken references here (commands, paths); the narrative doc rewrite is `issues/014-update-docs-two-service-monolith.md`

Verification:

- `pnpm install` regenerates the lockfile with the new package names and no old ones
- Full root `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
- `pnpm --filter @strengthsync/server exec wrangler deploy --dry-run` succeeds
- `pnpm --filter @strengthsync/client build` then confirm `apps/server` build/dry-run serves `../client/dist` (the turbo dependency chain must still build the client before the server)
- Local dev smoke: `wrangler dev` + vite dev, load the tracker against local D1

## Acceptance criteria

- [ ] `apps/client` and `apps/server` exist; `apps/ui` and `apps/api` are gone; `git log --follow` preserves history on moved files
- [ ] Package names are `@strengthsync/client` and `@strengthsync/server`; `grep -r "@strengthsync/ui\|@strengthsync/api" --include="*.json" --include="*.jsonc" --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.yml" --include="*.yaml" .` (excluding `node_modules`, `.git`, `issues/`, `docs/bug-reports/`) returns only historical-record hits
- [ ] wrangler `name` is still `strengthsync-api`; D1 ids and workflow binding names are unchanged; `assets.directory` points at `../client/dist`
- [ ] turbo still builds the client before the server (`pnpm build` order verified)
- [ ] Lint, typecheck, full test suite, build, and dry-run deploy all pass from the root
- [ ] Local dev smoke passes (tracker loads, save day, complete-week trigger)

## Blocked by

- Blocked by `issues/012-move-db-into-api-app.md`

## User stories addressed

- User story 8
- User story 10 (final wiring pass)
