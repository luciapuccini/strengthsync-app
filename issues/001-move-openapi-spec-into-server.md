# Move the OpenAPI spec into the server and delete the shared workspace

**STATUS: DONE**

## Parent PRD

`issues/prd-zod-first-api-contract.md` — see Solution (contract ownership) and Implementation
Decisions: "Contract ownership and consumption".

## What to build

A purely mechanical move. The spec stays hand-written and byte-identical in content; no route,
no schema, and no runtime behavior changes. After this slice the workspace has two packages
instead of three, the contract lives with the server that implements it, and the client owns
its generated types locally.

Moves:

- `shared/openapi.json` → `server/openapi.json` (package root, beside `wrangler.jsonc`. It sits
  outside `src`, so `server/tsconfig.json`'s `include: ["src"]` ignores it and it is not part of
  the TypeScript project)
- `shared/openapi.d.ts` → `client/src/api/openapi.d.ts` — **regenerated, not copied**, so the
  generation path is proven end to end in this slice

Edits:

- `client/src/api/client.ts:2`, `client/src/api/types.ts:1`, `client/src/api/workflows.ts:1`:
  `from "@strengthsync/shared"` → `from "./openapi"` (still `import type`, no other change)
- `client/package.json:15`: remove the `@strengthsync/shared` dependency
- `client/tsconfig.json`: remove the `{ "path": "../shared" }` project reference (leaving an
  empty `references` array, or drop the key)
- Root `tsconfig.json`: remove `{ "path": "./shared" }`
- `pnpm-workspace.yaml`: `packages:` becomes `[client, server]`
- Root `package.json`: add `openapi-typescript` as a devDependency (move the version currently
  in `shared/package.json`, keep it identical) and two scripts:
  - `gen:openapi` → `openapi-typescript server/openapi.json -o client/src/api/openapi.d.ts`
  - `check:openapi` → regenerate to a scratch path and `diff -u` against the committed file
    (same shape as the script being deleted)
- `.github/workflows/ci.yml:29`: `pnpm --filter @strengthsync/shared check:openapi` → `pnpm check:openapi`
- `eslint.config.js`:
  - remove `'@strengthsync/shared'` from `ALL_WORKSPACES` (:13)
  - remove the `boundary(['shared/**/*.ts'], [])` rule (:82)
  - the client boundary (:84) becomes `boundary(['client/**/*.{ts,tsx}'], [])` — the client now
    imports **no** workspace package, a strictly tighter invariant than before
  - move the `max-lines` / `max-lines-per-function` exemption (:79) from `shared/openapi.d.ts`
    to `client/src/api/openapi.d.ts`
- `docs/architecture/api_contracts.md:5,26`: repoint at `server/openapi.json`. Also fix the
  stale sentence naming `services/domain/contracts` — that layout no longer exists.

Delete: the entire `shared/` directory.

`turbo.json` needs **no change**. It has no `shared`-specific task, and because the generated
types are committed inside `client/`, `--affected` still sees a contract change as a client change.

Explicitly NOT in this slice: any route change, any Zod work, adding `@hono/zod-openapi`, or
touching the spec's *content*.

## Why not a workspace dependency on the server

Rejected deliberately. `turbo.json:26` declares `@strengthsync/server#build` depends on
`@strengthsync/client#build`, because the Worker bundles the SPA as static assets. Adding
`@strengthsync/server` to the client's dependencies would make the generic `build` task's
`^build` pull the server's build from the client's build — a cycle, which turbo rejects outright.

## Acceptance criteria

- [x] `shared/` no longer exists and `pnpm-workspace.yaml` lists exactly `client` and `server`
- [x] `server/openapi.json` is byte-identical in content to the file that was in `shared/` — git recorded it as a pure rename
- [x] `pnpm gen:openapi` regenerates `client/src/api/openapi.d.ts` with a clean `git diff` (generation is reproducible)
- [x] `pnpm check:openapi` passes
- [x] `grep -rn "@strengthsync/shared" .` returns nothing outside `.claude/` and `pnpm-lock.yaml`
- [x] `pnpm install` produces a lockfile with no `@strengthsync/shared` entry
- [x] eslint's client boundary allows no workspace package, and linting the client still passes — verified via `eslint --print-config`
- [x] CI's contract step invokes the root `check:openapi`
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass from the root (80 tests)
- [x] `pnpm --filter @strengthsync/server build` (wrangler dry-run) still succeeds
- [x] `docs/architecture/api_contracts.md` names `server/openapi.json`, with no reference to `shared/` or `services/domain`

### Notes from implementation

- The regenerated `client/src/api/openapi.d.ts` is byte-identical to the deleted `shared/openapi.d.ts`,
  which confirms the move changed nothing about the contract itself.
- `check:openapi` regenerates to `/tmp/strengthsync-openapi.d.ts` (was `/tmp/openapi.d.ts`) so the
  scratch file cannot collide with an unrelated project's.
- `pnpm build` runs clean, confirming no turbo cycle was introduced.
- `docs/architecture/monorepo_structure.md`, which slice 008 expects to update, **does not exist**.
  Adjust 008's checklist when it comes up.

## Blocked by

None — can start immediately.

## User stories addressed

- User story 6 (workspace matches deployment topology)
- User story 7 (contract lives with its implementation)
- User story 8 (client depends on no workspace package)
- User story 19 (generated artifacts committed)
- User story 20 (no build-task cycle)
- User story 21 (docs name the real source of truth)
