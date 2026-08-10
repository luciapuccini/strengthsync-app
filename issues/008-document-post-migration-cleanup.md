## Parent PRD

`docs/architecture/workflows.md`

## What to build

Document the leftover V2 and legacy artifacts that should be consolidated after the Cloudflare Workflow migration is stable.

This issue is documentation only. No code changes.

Topics to capture:

- Consolidate `completeWeekV2` / `completeWeek`.
- Consolidate `listWeeksV2` / `listWeeks`.
- Consolidate `activateGeneratedPlanV2` / `activateGeneratedPlan`.
- Remove or retire `services/db/src/repositories/internal.ts`.
- Replace inline hard-coded workflow prompts with domain builders.
- Update tests that still use the old signatures.

## Acceptance criteria

- [x] Cleanup tracking issue is written in `issues/`.
- [x] No code changes.

"STATUS":"DONE"

## Blocked by

- `issues/001-rename-workflow-file.md`
- `issues/002-return-explicit-result-from-weekly-progression-branch.md`
- `issues/003-detect-plan-boundary-and-load-completed-weeks.md`
- `issues/004-summarize-profile-in-plan-turnover-branch.md`
- `issues/005-summarize-history-in-parallel-with-profile.md`
- `issues/006-generate-plan-from-summaries.md`
- `issues/007-activate-generated-plan-atomically.md`

## User stories addressed

- Migration cleanup from `docs/architecture/workflows.md`.
