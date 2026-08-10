# Trim the domain package and normalize workflow imports

**STATUS: DONE**

## Parent PRD

`issues/prd.md` — see Implementation Decisions: "Domain trimming"; User story 21.

## What to build

Reduce `services/domain` to what the Cloudflare path actually uses, and fix the package-boundary bypass in the surviving workflow files, so the package documents reality and the eslint boundary rule binds again.

Contract deletions (`services/domain/src/contracts/`), with their schema tests:

- Workflow status/start schemas (`WorkflowTypeSchema`, `WorkflowStatusSchema`, `WorkflowStartedSchema`, `StartWeeklyProgressionSchema`, `StartPlanGenerationSchema`)
- Workflow input/result schemas (`WeeklyProgressionInputSchema`/`Result`, `PlanGenerationInputSchema`/`Result`)
- Internal command schemas (`CompleteWeekCommandSchema`, `CreateNextWeekCommandSchema`)
- The context-query schemas `WeeklyContextSchema` and `PlanGenerationContextSchema` (not "command schemas" by name, but their only importers were the deleted routes/repository/worker)
- Keep `GeneratedPlanInputSchema` and `ActivateGeneratedPlanCommandSchema` — the Cloudflare plan-turnover branch uses them. The OpenAPI document needs no change (already Cloudflare-only). Fix the stale header comment pointing at workflow inputs/outputs doc

Coach-module reduction (`services/domain/src/coach/`):

- Keep only what the Cloudflare workflow imports: `COACHING_RULES`, `WeekAnalysisSchema`/`WeekAnalysis`, `NextWeekScheduleSchema`/`NextWeekSchedule`, `ProfileSummarySchema`, `HistorySummarySchema`
- Delete the five prompt builders (`buildSummarizeProfilePrompt`, `buildSummarizeHistoryPrompt`, `buildGeneratePlanPrompt`, `buildAnalyzeWeekPrompt`, `buildGenerateNextWeekPrompt`), the four prompt-input schemas/types, `NO_PRIOR_HISTORY_SUMMARY`, `WorkflowLlmStep`, and any summary types left unreferenced — the deleted worker/agent packages were their only consumers, and the surviving workflow builds its prompts inline
- Remove stale doc comments referencing the deleted agent package and Temporal-era docs

Import normalization (the only edit to surviving application code in the whole sweep):

- In `apps/api/src/workflows/strengthsync-workflow.ts` and `plan-turnover.ts`, replace the deep relative imports (`../../../../services/domain/src/coach/weekly-progression`, `../../../../services/db/src/dates`) with package imports (`@strengthsync/domain/coach`, `@strengthsync/db`) and remove the `// I dont like these imports it should be a package [TBD]` comment. If `@strengthsync/db` does not currently re-export `addDays`, add it to the package's public exports rather than keeping the deep import
- No logic, prompt, retry, or step-structure changes to the workflow (PRD Out of Scope)

## Acceptance criteria

- [ ] Every removed schema/type/builder has zero remaining imports (`grep` clean across `apps/` and `services/`)
- [ ] `services/domain` exports exactly what the surviving code imports — no more, and nothing the surviving code needs is missing
- [ ] No deep relative import into another package's `src/` remains in `apps/api/src`; the workflow files import only via package names
- [ ] `pnpm --filter @strengthsync/domain lint`/`typecheck`/`test` pass; `pnpm --filter @strengthsync/api typecheck` and `test` pass with the normalized imports
- [ ] `pnpm lint` passes with no eslint boundary violations

## Blocked by

- Blocked by `issues/002-delete-api-internal-and-proxy-surface.md` (the deleted routes are importers of the command/context schemas)
- Blocked by `issues/003-delete-temporal-worker-and-legacy-agent-packages.md` (the worker/agent packages are the last consumers of the prompt builders, `WorkflowLlmStep`, and context schemas)

## User stories addressed

- User story 6
- User story 21
