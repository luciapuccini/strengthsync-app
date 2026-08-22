# The week should end itself instead of waiting for a button

Your note — "complete week process could be automated, not a button, ex on last
day saved" — is already worked out in full. `docs/future_state_after_mvp/auto-complete-week/prd.md`
is a written PRD for exactly this, and it lands on a different trigger than the
one the note guesses at: **the week's end date passing**, not the last day being
saved. This card is the pointer plus the two things the raw note adds.

## Why the trigger is the date, not the last save

A week has an `end_date` written on the row when the week is created; it never
moves and nothing the athlete does affects it. Firing on "last day saved" gets
two cases wrong that the date does not:

- The athlete who finishes all seven days on day five would have next week
  generated early, and the plan's dates would drift forward every week.
- The athlete who skips or never saves the last day would never turn over at all
  — and skipping is exactly the signal `analyze-week` exists to read
  (`WEEK_ANALYSIS_SYSTEM`, `server/src/workflows/strengthsync-workflow.ts:40`,
  which explicitly reasons about `completed:false` days).

The PRD's answer is a daily scheduled job at midday UTC — the only hour at which
every timezone's previous day is over — that starts the same
`STRENGTHSYNC_WORKFLOW` the button starts today, for any athlete whose current
week ended in the past. The button survives as an escape hatch for the window
between the athlete's local midnight and the job.

## What that PRD calls out and this note does not

The button is not just an unnecessary chore — it is load-bearing for a bug. The
current-week read filters on the date window as well as the status — verified,
`server/src/db/repositories/weeks.ts:34` returns `null` when
`today > week.end_date` even though the row is still `in_flight` — so the morning
after a week ends the live week stops being returned, and the tracker reads that
absence as "no plan" and offers to build a first plan. Every athlete
in the invited cohort reaches that screen in their second week, and some of them
will accept and start a second plan on top of the first. That is what makes this
urgent rather than tidy.

## One defect found while reading the button

`client/src/routes/tracker-page/components/week-tracker/components/complete-week-button/completeWeekButton.tsx:13`
has `// setIsRunning(true);` commented out. `isRunning` is therefore always
false: the button never disables, never shows its spinner, and never renders its
`Analyzing…` label. A workflow that takes thirty to sixty seconds of model calls
gives a toast and a button that still looks idle, so a second press starts a
second `STRENGTHSYNC_WORKFLOW` instance — a second `complete-week`, a second set
of paid calls. Line 19 also still `console.log`s the instance id. Both are
one-line fixes and both are worth taking even if the scheduled job is deferred,
because the button remains the escape hatch either way.

---

## Category

**3. Enhancement** — an idea from development that changes how the product
behaves rather than fixing what it does, and it is already refined past this
note into a PRD with user stories. The commented-out `setIsRunning` inside it is
a plain bug and can be fixed independently.

---

## Priority

**1. Top** — not for the automation itself but for what the PRD found underneath
it. `docs/mvp.md` runs the cohort for two weeks, and every athlete crosses their
first week boundary inside that window; the false "you have no plan" screen
therefore lands on all twenty of them, on the screen the success metric is read
off. Doing nothing here means the MVP measures a bug as well as a product. The
`setIsRunning` fix is minutes and should not wait for the scheduled job.

**Next step:** the PRD exists but has not been sliced. `/prd-to-issues` against
`docs/future_state_after_mvp/auto-complete-week/prd.md` is the move — and it
should probably leave `future_state_after_mvp/`, since the bug it fixes is
in-window rather than post-MVP.

---

## Original note

> complete week process could be automated, not a button. ex on last day saved
