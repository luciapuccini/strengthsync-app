# Remove the "Generate plan" UI feature and orphaned UI state

## Parent PRD

`issues/prd.md` — see Implementation Decisions: "UI feature removal"; Testing Decisions: "Deletions, not rewrites".

## What to build

Remove the on-demand "Generate plan" feature from the tracker UI end-to-end, plus the UI code that becomes orphaned by its removal. After this slice the tracker only offers "Complete week", and the no-week empty state is honest about plan generation being temporarily unavailable. Nothing in this slice touches the API — the legacy workflow-proxy routes remain in place but lose their only consumer (they are deleted in `issues/002-delete-api-internal-and-proxy-surface.md`).

Deletions:

- `apps/ui/src/routes/tracker-page/components/week-tracker/components/generate-plan-button/` (the whole component)
- Its import and render in `week-heading/weekHeading.tsx`
- The commented `{/* <GeneratePlanButton /> */}` reference in `tracker-page/trackerPage.tsx`
- Legacy workflow client functions in `apps/ui/src/api/client.ts` (`startWeeklyProgression`, `startPlanGeneration`, `getWorkflowStatus`) with their now-unused schema/type imports, and their cases in `client.test.ts`
- `apps/ui/src/api/workflowPolling.ts` and `workflowPolling.test.ts`
- The store's `refreshTracker` action in `apps/ui/src/store/slices/trackerSlice.ts` (its only live caller was the deleted button) and its tests in `trackerSlice.test.ts`; also update the stale `refreshTracker()` mention in the `trackerPage.tsx` hydration comment
- `apps/ui/src/utils/completeWeekCooldown.ts` and its test (the cooldown starter exists only in commented-out code, so the utility is inert)
- All commented-out legacy import/logic blocks in `complete-week-button/completeWeekButton.tsx` (they reference the deleted polling utility)

Edits:

- `trackerPage.tsx` empty-state copy: stop telling the coach to "Generate a plan…"; state that no week is active and plan generation is temporarily unavailable. Remove the broken-action risk per PRD story 17 (a `CompleteWeekButton` rendered with no current week should not remain as a dead action).

## Acceptance criteria

- [ ] No import of `GeneratePlanButton`, `workflowPolling`, `completeWeekCooldown`, or the legacy workflow client functions remains anywhere in `apps/ui/src`
- [ ] `refreshTracker` no longer exists in the store, and no caller or test references it
- [ ] The week heading renders without the Generate-plan button; the "Complete week" button's live behavior is unchanged
- [ ] The no-current-week empty state copy no longer advertises plan generation and renders no broken action
- [ ] `pnpm --filter @strengthsync/ui lint`, `typecheck`, and `test` all pass
- [ ] `grep -ri "generatePlan\|waitForWorkflow\|workflowPolling" apps/ui/src` returns nothing

## Blocked by

None - can start immediately

## User stories addressed

- User story 14 (UI portion)
- User story 15
- User story 16
- User story 17
- User story 20
