# History CSV export

Export the history of the active plan as one CSV file. The athlete opens it in
Google Sheets or Excel and reads each exercise's progress from left to right,
one week after the other.

Reference layout: `docs/issues/Entrenamiento - Hoja 1.csv` (the athlete's
own sheet before StrengthSync).

## Decisions

Agreed in a grill session on 2026-10-01. Do not reopen these without a new reason.

| Topic | Decision |
|---|---|
| Orientation | Rows are the routine (day blocks, then exercises). Columns are weeks. |
| Weeks | Completed weeks of the active plan only, the same data as the history view (`completedWeeksResource`). Sort by `week_index`. |
| Rows | From `plan.week_template`, grouped by `day_index`, in template order. If an exercise is in a week but not in the template, add it at the end of its day block. Match rows on `day_index + exercise_key`, the same key as `toWeekHistory`. |
| Non-strength days | Leave out `rest`, `activity` and `cardio` days. |
| Base columns | `Exercise, Series, Reps, Rest (s), Base weight (<unit>)`, from the template prescription. |
| Per-week columns | `S<n> - series, S<n> - reps, S<n> - weight (<unit>)`: the performed values of the first set (the same `scalars()` rule as `toWeekHistory`). |
| Empty and skipped | Empty cells. An exercise that is skipped or missing in a week gives empty cells. Feedback is not exported. |
| Diff column | Not exported. |
| Units | The athlete's preference, through `toDisplayWeight`. Cells hold numbers only. The unit is in the header (`kg` or `lb`, from `unitLabel`). Decimals use a dot. |
| Labels | English, the same as the app. |
| Entry point | One "Export CSV" action on the history page. It exports the full plan, not only the week on screen. It does not show when there are no completed weeks. A ui-craft pass decides the final UX (step 2). |
| File name | `strengthsync-<plan-label-slug>-<YYYY-MM-DD>.csv`. The date is today, local time. |
| Where | Client only. No endpoint, no OpenAPI change, no new dependency. |
| Analytics | No event. |

## Target layout

Every row has the same number of columns. Each day block ends with one empty row.

```csv
,,,,,S1 - 15/12/2025,,,S2 - 22/12/2025,,
Day 1 - Upper body,,,,,,,,,,
Exercise,Series,Reps,Rest (s),Base weight (kg),S1 - series,S1 - reps,S1 - weight (kg),S2 - series,S2 - reps,S2 - weight (kg)
Bench press,4,10,90,7,4,10,7,4,10,9
Face pull,3,12,90,3,,,,3,12,3
,,,,,,,,,,
Day 2 - Leg day,,,,,,,,,,
Exercise,Series,Reps,Rest (s),Base weight (kg),S1 - series,S1 - reps,S1 - weight (kg),S2 - series,S2 - reps,S2 - weight (kg)
Squat,4,10,90,14,4,10,14,4,10,15
,,,,,,,,,,
```

- Row 1: the week label is in the first cell of each 3-column group. The date is
  `formatIsoDate(week.start_date)`.
- Day title: `Day <day_index> - <day type label>`.
- In the example, `Face pull` was skipped in S1, so its S1 cells are empty.

## CSV safety rules

These are standard. They are not open decisions.

- Quote cells as RFC 4180 requires: wrap a cell in `"` when it contains `,`, `"`,
  CR or LF, and double each inner `"`.
- Use CRLF line endings.
- Start the file with a UTF-8 BOM (`﻿`), so Excel shows accents correctly.
- Put `'` before a text cell that starts with `=`, `+`, `-` or `@`. Exercise names
  come from the LLM, so this blocks formula injection when the file is opened.

## Plan

Do the steps in this order. Each step is small and you can verify it alone.

### Step 1: Pure function `toHistoryCsv` (AFK, TDD)

Files:

- `client/src/routes/history/toHistoryCsv.ts` (new), next to `toWeekHistory.ts`.
- `client/src/routes/history/toHistoryCsv.test.ts` (new).
- `client/src/lib/day-types.ts`: move `DAY_TYPE_LABELS` here from
  `dayHeader.tsx`, and import it in both places. The CSV is the second real
  caller, so the move is justified.

Signature:

```ts
export function toHistoryCsv(weeks: Week[], plan: Plan, unit: UnitPreference): string;
```

Reuse, do not copy:

- `toDisplayWeight`, `unitLabel` from `@/utils/units`.
- `formatIsoDate` from `@/utils/formatIsoDate`.
- The first-set rule from `toWeekHistory.ts`. Export `scalars` from there, or
  read `sets[0]` with the same comment. Do not make a second, different rule.
- `makeWeek` from `@/test/weekFixture` in the tests.

Write the tests first. One test for each behavior:

- [x] No weeks: the output has the header rows and the template rows, and no week columns.
- [x] Two weeks, metric: the output is equal to the target layout above.
- [x] Imperial: the header says `lb`, and the weights are not converted.
- [x] Weeks in the wrong order are sorted by `week_index`.
- [x] A skipped exercise (empty `sets`) gives three empty cells.
- [x] An exercise in a week but not in the template goes at the end of its day block.
- [x] Rest, activity and cardio days do not show.
- [x] A name with a comma or a quote is quoted correctly.
- [x] A name that starts with `=` gets a `'` prefix.
- [x] The output starts with the BOM and uses CRLF.

Done when `pnpm test` and `pnpm typecheck` pass.

### Step 2: ui-craft pass on the entry point (HITL)

Run the `ui-craft` skill on the history page before you write UI code. Decide:

- The placement. The default is an outline button next to Previous / Next in
  the header. Examine how it looks on a phone, where the header already wraps.
- The label and icon (for example `Download` from `lucide-react`, which is
  already a dependency).
- How to make clear that it exports the full plan, not only the week on screen.
- Accessibility: the accessible name and focus order.

Record the result in this file, under "UX outcome". The user approves it
before step 3.

### Step 3: Download wiring (AFK)

Files:

- `client/src/routes/history/historyPage.tsx`: show the action from step 2.
- The download code: a small function that makes a `Blob`
  (`text/csv;charset=utf-8`), clicks a temporary `<a download>`, and calls
  `URL.revokeObjectURL`. Keep it local to the history route. It has one caller,
  so it does not go in a shared util.
- The file name slug: lowercase `plan.label`, replace each run of
  non-alphanumeric characters with `-`, and remove `-` at the start and end.

`plan` can be `null` in `HistoryData`. In that case `history.length === 0`, and
the page returns early, so the action never needs a null check after that point.

Done when:

- [x] The action shows only when there are completed weeks.
- [x] A click downloads one file with the correct name.
- [x] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass.

### Step 4: Manual validation and final check (HITL)

- [ ] In dev, with a plan that has 2 or more completed weeks, export the file and
      open it in Google Sheets. Compare it with the reference sheet.
- [ ] Do it again with the metric and the imperial preference.
- [ ] Open the file in Excel or Numbers and make sure accents and numbers show correctly.
- [ ] Are we on track with this plan? Write down any change from the decisions above.
- [ ] Do the new files follow the project rules (`.claude/rules/developer_preferences.md`)?
- [x] Are bugs or side findings written down in `docs/` and not fixed in this change?
      The 32px touch target is in `docs/todos/todos.md`. `todayIso()` in
      `lib/dates.ts` gives the UTC date, so the file name uses its own local date.
- [ ] Is `README.md` updated? Add one line under the user flows for the history export.
- [ ] Suggested next steps.

## Out of scope

- Archived plans and history across plans (see `docs/kanban/history-scoped-to-active-plan.md`).
- The in-progress week and empty columns for future weeks.
- Feedback, skip markers, all-set detail and the diff column.
- A server endpoint and analytics events.

## UX outcome

Proposed in the step 2 ui-craft pass on 2026-10-01. Approved by the user on 2026-10-01.

**Placement: a plan row above the week header, not in the week header.**
Previous / Next act on the week on screen. The export acts on the full plan. If
the export button is next to Previous / Next, it looks like a week action. A
separate row above the week header gives the action the plan's scope. Also, the
week header does not wrap (`flex justify-between`), and it already holds the
title, the date range and two buttons. A third button would make it too narrow on
a phone.

```
Strength block · 3 completed weeks      [⤓ Export plan (CSV)]
Week S3 / S6  15/12/2025 – 21/12/2025       [Previous] [Next]
...day sections...
```

- Left: `plan.label` and `· N completed weeks` as muted `text-sm` text. This
  tells the user that the file holds all completed weeks. Use "week" when N is 1.
- Right: `<Button variant="outline" size="sm">` with the `Download` icon from
  lucide on the left of the label, at `size-4`, with `aria-hidden`. A left icon
  shows the type of action (components.md). Outline matches Previous / Next, so
  the action stays secondary.
- Label: "Export plan (CSV)". It says the scope (plan) and the format (CSV).
- Row: `flex flex-wrap items-center justify-between gap-2`. On a narrow phone,
  the button goes below the text and does not overflow.

**Accessibility**
- The accessible name is the visible label. Do not add an `aria-label`.
- Focus order follows the source order: Export, then Previous, then Next. The
  page-level action comes before the week controls.
- No toast and no loading state. The download is instant and local, and the
  browser shows the download.
- `size="sm"` is 32px high. This is less than the 44px touch target, but it is
  the same as Previous / Next. Record this in `docs/` as a side finding. Do not
  fix it in this change.

**Visibility.** The row shows only when there are completed weeks, after the
early return. The empty state does not change.

## STATUS

Steps 1 to 3 done. The export row is in `historyPage.tsx`, with a page test in
`historyPage.test.tsx`. Next: step 4 (manual validation, HITL).
