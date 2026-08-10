# Final verification gate

## Parent PRD

`issues/prd.md` — see User story 18 and Further Notes: "Verification gate before merge".

## What to build

Run the full existing toolchain over the post-sweep monorepo and prove the deletion is merge-safe. This is a verification slice, not a code slice: the only expected output is a green run (plus fixing anything the earlier slices missed, as small follow-up commits to the relevant slice's scope).

Verification steps:

1. Clean install from scratch: remove `node_modules` state (`pnpm install --frozen-lockfile` after a clean checkout, or equivalent) and confirm the regenerated lockfile is stable
2. `pnpm lint` — zero errors, including the eslint boundary rules over the trimmed package graph
3. `pnpm typecheck` — `tsc -b` across all remaining project references
4. `pnpm test` — the full remaining suite: public API, persistence repositories, domain contracts/coach survivors, UI
5. Worker dry-run deploy: `pnpm --filter @strengthsync/api exec wrangler deploy --dry-run` (or the package's existing deploy dry-run script) succeeds
6. Reference sweep: `grep -ri "temporal\|@strengthsync/agent\|@strengthsync/workflows\|/internal/\|WORKFLOW_API_URL\|WORKFLOW_SERVICE_SECRET\|INTERNAL_API_SERVICE_SECRET\|braintrust" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=.turbo .` returns hits only in historical records (`issues/`, `docs/bug-reports/`, `docs/architecture/DDS/`, git-ignored private notes)

## Acceptance criteria

- [ ] Clean install passes and `pnpm-lock.yaml` has no Temporal/Braintrust/autoevals/legacy-agent entries
- [ ] Lint, typecheck, and the full test suite pass from the repo root
- [ ] Worker dry-run deploy succeeds
- [ ] The reference sweep returns only the allowed historical hits
- [ ] Any regression discovered is traced back to its owning slice (001–006) and fixed there, not papered over in this slice

## Blocked by

- Blocked by `issues/001-remove-generate-plan-ui.md`
- Blocked by `issues/002-delete-api-internal-and-proxy-surface.md`
- Blocked by `issues/003-delete-temporal-worker-and-legacy-agent-packages.md`
- Blocked by `issues/004-delete-legacy-persistence-command-surface.md`
- Blocked by `issues/005-trim-domain-package-and-normalize-workflow-imports.md`
- Blocked by `issues/006-update-docs-cloudflare-only-architecture.md`

## User stories addressed

- User story 18
