## Parent PRD

`docs/architecture/workflows.md`

## What to build

Add the first LLM step of the plan-turnover branch: summarize the client profile.

In `apps/api/src/workflows/strengthsync-workflow.ts`:

- Add a `summarize-profile` step.
- Copy the hard-coded system string and prompt shape into the workflow file, matching the existing `weekAnalysis` and `nextWeek` style.
- Use `ProfileSummarySchema` from `@strengthsync/domain/coach` for the output.

Return a stub result so this step is independently verifiable.

## Acceptance criteria

- [ ] `summarize-profile` step runs when the plan is complete.
- [ ] Hard-coded prompt strings live in the workflow file, not imported from a domain builder.
- [ ] Output is validated by `ProfileSummarySchema`.
- [ ] `pnpm typecheck` passes.
- [x] `summarize-profile` step runs when the plan is complete.
- [x] Hard-coded prompt strings live in the workflow file, not imported from a domain builder.
- [x] Output is validated by `ProfileSummarySchema`.
- [x] `pnpm typecheck` passes.
- [x] `pnpm lint` passes.

"STATUS":"DONE"

## Blocked by

- `issues/003-detect-plan-boundary-and-load-completed-weeks.md`

## User stories addressed

- Plan-turnover branch from `docs/architecture/workflows.md`.
