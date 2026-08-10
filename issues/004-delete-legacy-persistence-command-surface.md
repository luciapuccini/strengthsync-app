# Delete the legacy persistence command surface

**STATUS: DONE**

## Parent PRD

`issues/prd.md` — see Implementation Decisions: "Persistence deletion"; Testing Decisions: "Deletions, not rewrites", "Prior art for the one adaptation".

## What to build

Reduce `services/db` to the repository surface the Cloudflare workflow and public API actually call, by deleting the legacy internal command repository built for Temporal activity retries.

Deletions:

- `services/db/src/repositories/internal.ts` — the idempotent command repository keyed by workflow id, **including** its context-query functions `getWeeklyContext` and `getPlanGenerationContext` (their only callers were the internal routes deleted in `issues/002-delete-api-internal-and-proxy-surface.md`)
- The corresponding re-exports in `services/db/src/index.ts`
- `findWeekByWorkflowId` in `services/db/src/repositories/internal-helpers.ts` (no surviving caller; the helpers used by the remaining plan repository — `findExistingActivation`, `buildScheduleFromTemplate` — stay)
- `services/db/src/repositories/weekly-commands.test.ts` and `services/db/src/repositories/plan-generation-context.test.ts` (both cover only the deleted repository — the latter's name does not say "internal", do not overlook it)

Adaptation (the reason this is not a plain strip):

- The **kept** day-log cases in `services/db/src/repositories/repositories.test.ts` currently seed state through the legacy `activateGeneratedPlan` and `completeWeek` from the deleted module, so deleting the file without touching the kept tests would not compile. Re-seed those cases through the remaining V2 repository functions (`activateGeneratedPlanV2` etc.) — the same adaptation pattern as the API testkit, with the same prior art (direct repository seeding already exists in the API suite)
- After the strip, verify `markAllDaysCompleted` in `services/db/src/testing/index.ts` still has a caller; delete it if not
- Fix stale comments in `services/db/src/schema.ts`: the `workflow_id` column docs ("the Temporal workflow that created this plan/week") and the header reference to "internal commands". The columns themselves stay — the Cloudflare workflow still writes them via `activateGeneratedPlanV2`

## Acceptance criteria

- [ ] `services/db/src/repositories/internal.ts` and its index re-exports no longer exist; `grep -rn "repositories/internal" services/db/src` returns nothing
- [ ] `findWeekByWorkflowId` is gone; the helpers used by the surviving plan repository are untouched
- [ ] The kept repository tests pass, seeding exclusively through remaining repository functions
- [ ] `grep -in "temporal\|internal command" services/db/src` returns nothing
- [ ] `pnpm --filter @strengthsync/db lint`, `typecheck`, and `test` all pass, and the API suite (which consumes `services/db`) still passes

## Blocked by

- Blocked by `issues/002-delete-api-internal-and-proxy-surface.md` (the internal routes import this repository; deleting it first breaks the API build)

## User stories addressed

- User story 7
- User story 14 (persistence portion)
