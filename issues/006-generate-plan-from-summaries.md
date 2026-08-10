## Parent PRD

`docs/architecture/workflows.md`

## What to build

Add the plan-generation LLM step that consumes the profile and history summaries.

In `apps/api/src/workflows/strengthsync-workflow.ts`:

- Add a `generate-plan` step.
- Copy the hard-coded system string and prompt shape into the workflow file, matching the existing `weekAnalysis` and `nextWeek` style.
- Use `GeneratedPlanInputSchema` from `@strengthsync/domain/contracts` for output validation.

Return a stub result so this step is independently verifiable.

## Acceptance criteria

- [ ] `generate-plan` step runs when the plan is complete.
- [ ] Hard-coded prompt strings live in the workflow file.
- [ ] Output is validated by `GeneratedPlanInputSchema`.
- [ ] `pnpm typecheck` passes.
- [x] `generate-plan` step runs when the plan is complete.
- [x] Hard-coded prompt strings live in the workflow file.
- [x] Output is validated by `GeneratedPlanInputSchema`.
- [x] `pnpm typecheck` passes.
- [x] `pnpm lint` passes.

"STATUS":"DONE"

## Blocked by

- `issues/005-summarize-history-in-parallel-with-profile.md`

## User stories addressed

- Plan-turnover branch from `docs/architecture/workflows.md`.
