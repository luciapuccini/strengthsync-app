# Bug: week-draft schema hard-codes a third DayType enum copy

**Status:** open  
**Found during:** scoping / review of onboarding day-type work (issue `001` — remap day types per `issues/prd.md`)  
**Severity:** low now; high when day types change

## Summary

`client/src/lib/week-draft-schema.ts` defines its own `DayTypeSchema` with a literal enum that includes `'swimming'`, instead of reusing the client runtime list in `client/src/lib/day-types.ts`. That makes three independent copies of the same vocabulary.

## The three copies

| # | Location | Form |
|---|----------|------|
| 1 | `server/src/domain/model/index.ts` | `DAY_TYPES` → `DayTypeSchema` (canonical domain) |
| 2 | `client/src/lib/day-types.ts` | `DAY_TYPES` (documented browser runtime mirror) |
| 3 | `client/src/lib/week-draft-schema.ts` | hard-coded `z.enum(['upper_body', 'leg_day', 'rest', 'swimming', 'cardio'])` |

Copy 2 is intentional: the client cannot import server domain code, and history already does the right thing (`z.enum(DAY_TYPES)` in `toWeekHistory.ts`). Copy 3 is not intentional — it duplicates the list again inside the localStorage draft validator.

## Why it matters

The onboarding PRD (`issues/prd.md`) renames day types (`swimming` → `activity`, add `full_body`) and lists the places to update: domain enum, browser runtime copy, UI labels, seeds, generated contract. It does **not** mention `week-draft-schema.ts`.

If issue `001` updates only the known two lists, localStorage draft validation will still reject (or accept the wrong) day types until this third literal is changed by hand. Drift is silent until a draft round-trips through `weekDraftStorage`.

## Suggested fix

In `week-draft-schema.ts`, import `DAY_TYPES` from `@/lib/day-types` and use `z.enum(DAY_TYPES)` — same pattern as `toWeekHistory.ts`. Do not add a fourth list.

When the onboarding day-type remap lands, treat this file as in-scope even though the PRD omitted it.
