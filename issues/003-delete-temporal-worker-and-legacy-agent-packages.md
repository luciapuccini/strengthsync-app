# Delete the Temporal worker and legacy agent packages

## Parent PRD

`issues/prd.md` — see Implementation Decisions: "Worker package deletion", "Legacy agent package deletion", and the tooling parts of "Config and docs"; Further Notes (lockfile regen).

## What to build

Delete the two legacy packages in one sweep and remove every tooling reference to them, so the monorepo builds, lints, and tests as if they never existed.

Package deletions:

- `apps/workflows/` — the entire Temporal worker/start-API package: Temporal client and launcher, both Temporal workflows, all activities, the Hono start API, its tests, the observability recorders (`llm-call-recorder.ts`, `braintrust-recorder.ts`), the manual Braintrust eval harness (`evals/`), and the `Dockerfile`
- `services/agent/` (`@strengthsync/agent`) — its only consumers were the worker package's activities, recorders, and eval harness. This removes the duplicated structured-generation runtime and the `LlmCallRecorder`/`WorkflowLlmContext` contract. Per the PRD decision: the recorder contract is **not** preserved; when Braintrust tracing is re-wired it will be defined fresh inside `apps/api/src/agent`. (`apps/api/src/agent/agent-core.ts` stays — it is the surviving runtime.)

Tooling cascade (all in this slice, so the repo stays green):

- Root `tsconfig.json`: remove the `./services/agent` and `./apps/workflows` project references
- `eslint.config.js`: remove `@strengthsync/workflows` and `@strengthsync/agent` from the workspace list, the `apps/workflows` node-globals block, the `services/agent` and `apps/workflows` boundary rules, the stale `@strengthsync/agent` entry in the `apps/api` allow-list, and the now-vestigial `@temporalio/*` ban for `apps/ui`
- `pnpm-workspace.yaml`: review `allowBuilds` (`braintrust`, `autoevals`, `protobufjs`, `@swc/core`/`tsx`, `sharp`) and the catalog entries that only existed for the deleted packages
- Root `package.json`: remove the `eval:score` / `eval:replay` scripts (they filter on the deleted package)
- `turbo.json`: remove the orphaned `dev:api`, `dev:worker`, and `docker:build` tasks
- Delete `docker-compose.workflows.yml`, `.env.workflows`, `.env.workflows.example`
- Delete the root `.dev.vars.example` outright (it is entirely worker-scoped: Temporal vars, `WORKFLOW_SERVICE_SECRET`, `INTERNAL_API_*`, `OPENAI_*`, `BRAINtrust_*`) and scrub the git-ignored root `.dev.vars`
- `.github/workflows/ci.yml`: remove the stale comment block about excluding `apps/workflows`
- Regenerate `pnpm-lock.yaml` (`pnpm install`) to prune Temporal, Braintrust/autoevals, and legacy-agent dependencies

Documentation of this slice's decisions (evals.md, mvp_scope.md, monorepo_structure.md, etc.) is handled in `issues/006-update-docs-cloudflare-only-architecture.md`, not here.

## Acceptance criteria

- [ ] `apps/workflows/` and `services/agent/` no longer exist
- [ ] `grep -ri "temporal\|@strengthsync/agent\|@strengthsync/workflows" --exclude-dir=node_modules --exclude-dir=.git .` returns hits only in `docs/`, `README.md`, `issues/`, git-ignored notes, and historical bug reports (docs are cleaned in slice 006)
- [ ] Root `tsconfig.json`, `eslint.config.js`, `turbo.json`, root `package.json`, and `pnpm-workspace.yaml` contain no references to either deleted package
- [ ] `docker-compose.workflows.yml`, `.env.workflows*`, and root `.dev.vars.example` are gone
- [ ] Clean `pnpm install`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` all pass from the repo root

## Blocked by

None - can start immediately (nothing outside `apps/workflows` imports either package; verified by grep)

## User stories addressed

- User story 2
- User story 3
- User story 8
- User story 9
- User story 10 (root env portion)
- User story 11 (tooling portion)
- User story 14 (worker/agent suites)
- User story 19
