# Turborepo task graph

How task orchestration works across the workspace. See
[`turbo.json`](../../turbo.json) for the task definitions.

Turborepo infers the package dependency graph from each package's
`package.json` (`workspace:*` dependencies) — the same graph documented in
[`monorepo_structure.md`](./monorepo_structure.md) and mirrored by the
TypeScript project references in each `tsconfig.json`
(`services/domain` → `services/agent`/`services/db`/`apps/ui` →
`apps/api`). Turbo does not need a separate graph
definition; it reuses `workspace:*` deps and each package's own scripts.

## Tasks

| Task | `dependsOn` | Cached outputs | Notes |
| --- | --- | --- | --- |
| `typecheck` | `^typecheck` | `dist/**`, `*.tsbuildinfo` | Runs `tsc -b` per package; a package only typechecks after its own workspace dependencies do. |
| `lint` | — | none | Independent per package; `eslint .`. |
| `test` | `^typecheck` | none | `vitest run`; waits on dependencies' typecheck so a broken upstream type fails fast instead of surfacing as a confusing runtime test failure. |
| `build` | `^typecheck`, `^build` | `dist/**` | Only `apps/api` (`wrangler deploy --dry-run`) and `apps/ui` (`vite build`) define this script; Turbo skips packages without it. |
| `deploy` | `build` | none, `cache: false` | Only `apps/api`; a real deploy (Worker + in-Worker Cloudflare Workflow + D1 migrations), never cached. |

## Commands

| Command | What it does |
| --- | --- |
| `pnpm typecheck` / `lint` / `test` / `build` | `turbo run <task>` across every workspace package, using Turbo's local cache. |
| `pnpm typecheck:affected` / `lint:affected` / `test:affected` / `build:affected` | Same, but scoped with `--affected`: only packages with uncommitted/changed files (and their dependents) run; everything else is skipped, not just cache-hit. Intended for CI (see `github-actions` step). |

## Caching

Turbo hashes each task's declared inputs (source files, `package.json`,
lockfile, and `globalDependencies`: `tsconfig.base.json`,
`pnpm-workspace.yaml`) and skips re-running a task if the hash matches a
previous run — content-based, not timestamp-based. Local cache lives in
`.turbo/` (git-ignored). No remote cache is configured; every environment
(including CI, for now) rebuilds its own local cache from scratch on a
clean checkout, then gets incremental speedups within that run.

Baseline on this workspace (6 packages, warm `node_modules`, clean
`.tsbuildinfo`/`.turbo`):

| Run | Time |
| --- | --- |
| `pnpm typecheck` (cold) | ~2.6s |
| `pnpm typecheck` (fully cached) | ~15ms |
| `pnpm typecheck:affected` after a leaf-package change (e.g. `apps/ui`) | only that package + its dependencies re-run |
| `pnpm typecheck:affected` after a root-of-graph change (`services/domain`) | all 6 packages re-run, since everything depends on it |

## Why not remote caching or `turbo.json` task pipelines beyond this yet

Remote caching and cross-machine cache sharing are deferred until CI
(`github-actions` step) shows it's needed — a single-repo, single-runner
GitHub Actions job gets most of the win from `--affected` alone (skipping
unaffected packages entirely) before cache-sharing across runs adds
marginal value.
