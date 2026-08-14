# Bug: week-draft schema hard-codes a third DayType enum copy

**Status:** closed — fixed by `issues/001-generic-activity-vocabulary.md`
**Found during:** scoping / review of onboarding day-type work (issue `001` — remap day types per `issues/prd.md`)
**Severity:** low now; high when day types change

## Summary

`client/src/lib/week-draft-schema.ts` defined its own `DayTypeSchema` with a literal enum that included `'swimming'`, instead of reusing the client runtime list in `client/src/lib/day-types.ts`. That made three independent copies of the same vocabulary.

## The three copies

| # | Location | Form |
|---|----------|------|
| 1 | `server/src/domain/model/index.ts` | `DAY_TYPES` → `DayTypeSchema` (canonical domain) |
| 2 | `client/src/lib/day-types.ts` | `DAY_TYPES` (documented browser runtime mirror) |
| 3 | `client/src/lib/week-draft-schema.ts` | hard-coded `z.enum([...])` |

Copy 2 is intentional: the client cannot import server domain code, and history already does the right thing (`z.enum(DAY_TYPES)` in `toWeekHistory.ts`). Copy 3 was not intentional — it duplicated the list again inside the localStorage draft validator.

## Why it mattered

The onboarding PRD (`issues/prd.md`) renamed day types (`swimming` → `activity`, added `full_body`) and listed the places to update: domain enum, browser runtime copy, UI labels, seeds, generated contract. It did **not** mention `week-draft-schema.ts`.

If issue `001` had updated only the known two lists, localStorage draft validation would still have rejected (or accepted the wrong) day types until this third literal was changed by hand. Drift would have been silent until a draft round-tripped through `weekDraftStorage`.

## Fix applied

`week-draft-schema.ts` now imports `DAY_TYPES` from `@/lib/day-types` and uses `z.enum(DAY_TYPES)` — same pattern as `toWeekHistory.ts`. There is no longer a third list; a future day-type change only needs to touch the domain enum and the one browser runtime copy.
