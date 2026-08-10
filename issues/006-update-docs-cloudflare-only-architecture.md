# Update docs to the Cloudflare-only architecture

## Parent PRD

`issues/prd.md` — see Implementation Decisions: "Config and docs" (docs half); User story 12; the evals/mvp_scope decision in "Legacy agent package deletion".

## What to build

Make the written architecture match the deployed one. After slices 001–005 the code is Cloudflare-only; this slice rewrites or removes every document that still describes the Temporal stack, the tunnel, the internal command surface, or the legacy agent package.

Rewrite to Cloudflare-only:

- `README.md` — tech-stack table (drop the Braintrust claim in the LLM row until re-wired), remove the "Generate plan" flows (or mark them temporarily unavailable per PRD story 17), preconditions (Temporal CLI, Docker), the secrets table (single `apps/api/.dev.vars` remainder), the side-by-side dev commands (`@strengthsync/workflows dev:api/dev:worker`), the Docker Compose block, and the Temporal rows of the Troubleshoot table
- `docs/architecture/stack.md` — remove the pending-recorder wiring notes and `/internal/*` mentions; describe the single in-Worker workflow
- `docs/architecture/monorepo_structure.md` — remove the `services/agent` and `apps/workflows` sections, the `Agent` node from the dependency graph, and the associated boundary rules
- `docs/architecture/workflows.md` — remove the traced-LLM-call claims, the public status endpoint, internal idempotent writes, and references to the deleted prompt builders
- `docs/architecture/api_contracts.md` — remove the retired internal workflow-to-data API section and old workflow-route rows
- `docs/architecture/turborepo.md` and `docs/architecture/typescript_metrics.md` — drop the deleted packages from graphs and metrics tables
- `docs/operations/local_worker.md` — remove the Braintrust re-wiring line (the rest is already Cloudflare-clean)

Recorder/tracing decision (from the PRD): the `LlmCallRecorder` contract was deleted with `services/agent`; tracing will be redefined fresh inside `apps/api/src/agent` when it returns.

- `docs/architecture/evals.md` — rewrite to describe only the future re-wiring against `apps/api/src/agent`, or delete the doc; either way it must not describe the deleted harness, `pnpm eval:score/replay`, or the `services/agent` interface as present
- `docs/mvp_scope.md` — update the Braintrust-trace MVP requirement and the "pending record re-wiring" note to match the decision above

Remove or mark historical:

- `docs/architecture/system_design.md` (+ matching Temporal labels in `system_design.excalidraw`) — POC-era doc; delete it or clearly mark it superseded
- `docs/in_progress/api_env_wrangler_types.md` — this PRD completes exactly what it tracks; close it out (remove the file)
- `docs/future_state_after_mvp/extraordinary-week-context.md` and `rember_user.md` — fix the dead forward-references (`services/agent` paths, "`/internal/*` behavior remains unchanged")

Leave untouched per the PRD: historical migration issues, `docs/bug-reports/`, and the already-retired `docs/architecture/DDS/tunnel.md` (marked historical).

## Acceptance criteria

- [ ] `grep -ri "temporal\|tunnel\|/internal/\|services/agent\|apps/workflows\|LlmCallRecorder\|WORKFLOW_API_URL\|INTERNAL_API_SERVICE_SECRET" README.md docs/` returns hits only inside clearly-marked historical documents (`docs/bug-reports/`, `docs/architecture/DDS/`) or migration-history issues
- [ ] README run instructions work as written: copy `apps/api/.dev.vars.example`, migrate/seed, run the API and UI dev servers — no worker, tunnel, or Docker steps
- [ ] `docs/in_progress/api_env_wrangler_types.md` no longer exists
- [ ] No doc describes Braintrust tracing or eval commands as currently operational

## Blocked by

- Blocked by `issues/002-delete-api-internal-and-proxy-surface.md`
- Blocked by `issues/003-delete-temporal-worker-and-legacy-agent-packages.md`
- Blocked by `issues/004-delete-legacy-persistence-command-surface.md`
- Blocked by `issues/005-trim-domain-package-and-normalize-workflow-imports.md`

(Docs must describe the final state; writing them earlier guarantees staleness.)

## User stories addressed

- User story 8 (docs portion)
- User story 10 (docs portion)
- User story 12
- User story 19 (docs portion)
