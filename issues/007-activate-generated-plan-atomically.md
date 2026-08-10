## Parent PRD

`docs/architecture/workflows.md`

## What to build

Finish the plan-turnover branch by atomically activating the generated plan.

In `services/db/src/repositories/plans.ts`, create `activateGeneratedPlanV2(db, clientId, command)` by copying the logic from `services/db/src/repositories/internal.ts`. Export it from `@strengthsync/db`. Leave the old `activateGeneratedPlan` in `internal.ts` with a `warning:` comment.

In `apps/api/src/workflows/strengthsync-workflow.ts`:

- Add an `activate-plan` step.
- Call `activateGeneratedPlanV2(db, clientId, { workflow_id: event.instanceId, plan: generatedPlan })`.
- Return the final plan-turnover result:

```ts
{ plan_complete: true, plan_id: plan.id, first_week_id: firstWeek.id }
```

## Acceptance criteria

- [ ] `activateGeneratedPlanV2` lives in `services/db/src/repositories/plans.ts`.
- [ ] Old `activateGeneratedPlan` has a warning comment.
- [ ] Completing the last week archives the old plan, creates a new active plan, and creates week 1.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.

## Blocked by

- `issues/006-generate-plan-from-summaries.md`

## User stories addressed

- Plan-turnover branch from `docs/architecture/workflows.md`.
