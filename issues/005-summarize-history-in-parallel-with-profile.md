## Parent PRD

`docs/architecture/workflows.md`

## What to build

Add the second LLM summary step and run both summaries in parallel.

In `apps/api/src/workflows/strengthsync-workflow.ts`:

- Add a `summarize-history` step.
- Copy the hard-coded system string and prompt shape into the workflow file, matching the existing `weekAnalysis` and `nextWeek` style.
- Use `HistorySummarySchema` from `@strengthsync/domain/coach` for the output.
- Run `summarize-profile` and `summarize-history` in parallel with `Promise.all`.

Return a stub result so this step is independently verifiable.

## Acceptance criteria

- [ ] `summarize-history` step runs when the plan is complete.
- [ ] Both summary steps run in parallel.
- [ ] Hard-coded prompt strings live in the workflow file.
- [ ] Output is validated by `HistorySummarySchema`.
- [ ] `pnpm typecheck` passes.
- [x] `summarize-history` step runs when the plan is complete.
- [x] Both summary steps run in parallel.
- [x] Hard-coded prompt strings live in the workflow file.
- [x] Output is validated by `HistorySummarySchema`.
- [x] `pnpm typecheck` passes.
- [x] `pnpm lint` passes.

"STATUS":"DONE"

## Blocked by

- `issues/004-summarize-profile-in-plan-turnover-branch.md`

## User stories addressed

- Plan-turnover branch from `docs/architecture/workflows.md`.
