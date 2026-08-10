## Parent PRD

`docs/architecture/workflows.md`

## What to build

Add the entry point of the plan-turnover branch and load the completed-week history needed for plan generation.

In `apps/api/src/workflows/strengthsync-workflow.ts`:

- After `load-context`, check if `completedWeek.week_index >= currentPlan.total_weeks`.
- If true, run a `load-completed-weeks` step.
- The step reads completed weeks for the active plan.

Add `listWeeksV2(db, clientId, planId)` to `services/db/src/repositories/weeks.ts`. It hardcodes `status = 'completed'` and filters by `planId`. Export it from `@strengthsync/db`. Leave the existing `listWeeks` function with a `warning:` comment; do not update tests or legacy callers.

This issue returns a stub result so the branch is reachable and verifiable.

## Acceptance criteria

- [x] `listWeeksV2` exists and returns completed weeks for one plan.
- [x] `listWeeks` has a warning comment marking it as legacy.
- [x] Workflow reaches `load-completed-weeks` when the completed week is the plan's last week.
- [x] `pnpm typecheck` passes.
- [x] `pnpm lint` passes.

"STATUS":"DONE"

## Blocked by

- `issues/001-rename-workflow-file.md`

## User stories addressed

- Plan-turnover branch from `docs/architecture/workflows.md`.
