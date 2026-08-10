# Create the api-contract package and move the OpenAPI spec into it

**STATUS: TODO**

## Parent PRD

`issues/prd-monorepo-simplification.md` — see Solution (package layout) and Implementation Decisions: "Spec-first contract".

## What to build

Create `packages/api-contract` as the home of the HTTP contract and move the existing OpenAPI document into it, without changing any route or behavior. After this slice, the contract has its own workspace package, the UI's single existing `openapi-fetch` consumer imports generated types from the new package, and everything else is untouched. This slice is deliberately additive and mechanical — it creates the foundation every later slice builds on.

Moves:

- `services/domain/src/contracts/openapi.json` → `packages/api-contract/openapi.json` (content unchanged in this slice; it still only describes `/wf/complete-week`)
- `services/domain/src/contracts/openapi.d.ts` → `packages/api-contract/openapi.d.ts` (regenerated, not copied, so the generation path is proven)

New files:

- `packages/api-contract/package.json`:
  - `name: "@strengthsync/api-contract"`, `private: true`, `type: "module"`
  - `exports`: `{ ".": "./openapi.d.ts" }`
  - script `gen:openapi`: `openapi-typescript openapi.json -o openapi.d.ts`
  - scripts `typecheck`/`lint` following the existing per-package conventions (a minimal `tsconfig.json` that includes just the generated declaration file; `lint` may reuse the root flat config with no package-specific rules)
  - devDependency `openapi-typescript` (move the version currently in `services/domain/package.json`; keep the same version)
- `packages/api-contract/tsconfig.json` extending `tsconfig.base.json`

Edits:

- `pnpm-workspace.yaml`: add `packages/*` to `packages:` (keep `services/*` — those packages still exist until later slices)
- Root `tsconfig.json`: add `{ "path": "./packages/api-contract" }` to `references`
- `services/domain/package.json`: remove the `./contracts/openapi` export, the `gen:openapi` script, and the `openapi-typescript` devDependency
- `apps/ui/package.json`: add `"@strengthsync/api-contract": "workspace:*"` to dependencies (`openapi-fetch` stays)
- `apps/ui/src/api/cf-api/workflows-api.ts`: change `import type { paths } from "@strengthsync/domain/contracts/openapi"` to `from "@strengthsync/api-contract"` (no other change)
- `apps/ui/src/api/cf-api/complete-week.ts`: change its `components` import the same way
- `apps/ui/tsconfig.json`: add `{ "path": "../../packages/api-contract" }` to `references` (keep the domain reference — the UI still imports domain model types until `issues/010-migrate-ui-to-openapi-fetch.md`)
- `eslint.config.js`: add `'@strengthsync/api-contract'` to `ALL_WORKSPACES`; allow it in the `apps/ui` boundary rule; forbid it everywhere else for now (later slices re-allow it in the server). Add a boundary entry for `packages/api-contract` itself that bans all `@strengthsync/*` imports (the contract imports nothing)

Explicitly NOT in this slice: expanding the spec content (that is `issues/009-expand-openapi-spec-to-full-public-api.md`), moving domain/db, renaming apps.

## Acceptance criteria

- [ ] `packages/api-contract` exists with `openapi.json`, generated `openapi.d.ts`, `package.json`, `tsconfig.json`
- [ ] `pnpm --filter @strengthsync/api-contract gen:openapi` regenerates `openapi.d.ts` with a clean git diff (generation is reproducible)
- [ ] No file imports `@strengthsync/domain/contracts/openapi` anymore; `services/domain` no longer exports it and no longer depends on `openapi-typescript`
- [ ] `apps/ui` depends on `@strengthsync/api-contract` and its workflow API client compiles unchanged in behavior
- [ ] eslint boundary rules include the new package (UI allowed, everything else banned, contract self-contained)
- [ ] `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass from the root
- [ ] `pnpm --filter @strengthsync/api build` (wrangler dry-run) still succeeds
- [ ] `grep -r "contracts/openapi" --include="*.ts" --include="*.tsx" --include="*.json" apps services packages` returns nothing

## Blocked by

None - can start immediately

## User stories addressed

- User story 2 (package foundation; full-route coverage lands in 009)
- User story 10 (workspace/reference/eslint wiring for the new package)
