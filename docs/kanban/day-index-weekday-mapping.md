# Make `day_index` mean a weekday again

## Parent PRD

None. Follow-on from `issues/003-anchor-first-week-to-today.md`, recorded as a
known consequence in `docs/future_state_after_mvp/todos.md`.

## What to build

One conversion between the two things the codebase currently calls a "day", so
the rest day an athlete asked for lands on the weekday they named.

There are two independent numbering schemes in play and nothing converts between
them:

| Where | `1` means |
|---|---|
| `OnboardingAnswersSchema.rest_day` (`server/src/domain/onboarding/schema.ts:82`), `ONBOARDING_WEEKDAYS` (`client/src/lib/onboarding-schema.ts:29`) | Monday — the athlete picked it from a list of weekday names |
| `PlanDay.day_index` / `WeekDay.day_index` (`docs/architecture/domain_model.md:108`) | the first day of the training week |

Those agreed as long as training weeks started on Monday. Issue 003 anchored
week 1 to the activation day to stop handing new athletes days already in the
past, and that broke the coincidence: sign up on a Wednesday, say you rest on
Sundays, and `rest_day: 7` becomes `day_index 7` becomes the Tuesday. The offset
then chains forward forever, because week 2 starts at `completedWeek.end_date + 1`
(`server/src/workflows/strengthsync-workflow.ts:188`).

**Resolve it in favour of the weekday.** `day_index` goes back to meaning
ISO weekday, `1 = Monday … 7 = Sunday`, and the seven-day window is *rotated*
onto that instead of being read off sequentially. `buildScheduleFromTemplate`
(`server/src/db/repositories/internal-helpers.ts:42`) stops dating a day as
`start + (day_index - 1)` and dates it as:

```
offset = (day_index - isoWeekday(start) + 7) % 7
```

A Wednesday activation then runs Wed–Tue with `day_index` order 3, 4, 5, 6, 7,
1, 2 — every day still in the future, and `day_index 7` still a Sunday. When
`start` is a Monday the formula reduces to `day_index - 1`, so nothing about
today's Monday behaviour changes.

The obvious objection is that the athlete now meets the coach's template from
its middle. It does not matter: `week_template` is a *cycle* — every index 1–7
exactly once, repeated weekly — so rotating it preserves every adjacency the
coach designed. The only seam it introduces, `day_index 7` followed by
`day_index 1`, is the seam that already occurs at every week boundary today.

Two things ride along because the fix is wrong without them:

- **The server dates the next week, not the model.** Today
  `strengthsync-workflow.ts:53` instructs the model to "Date `day_index` 1 as
  `next_week_start_date` and each following day sequentially", and `saveNextWeek`
  (`server/src/db/repositories/weeks.ts:183`) stores whatever dates come back.
  Rotation is modular arithmetic and asking an LLM to do it per week is a
  needless failure mode — reuse the same dating helper week 1 uses.
  `NextWeekScheduleSchema` is an internal LLM-output schema and never reaches a
  route, so this needs no `gen:openapi` run.
- **The prompt has to state the convention.** `buildFirstPlanPrompt`
  (`server/src/domain/coach/first-plan.ts`) sends `schedule_preferences.rest_day`
  inside the profile JSON but never tells the model what `day_index` means or
  that the rest day belongs at that index — the placement is luck today. Say it.

`schedule` is emitted sorted by date so the tracker keeps rendering in
chronological order: `program.tsx:15` maps the array as-is and uses the array
position only for `isFirst`. Everything else — `updateDayLog`,
`weekDraftStorage`, `weekUtils`, the `NextWeekScheduleSchema` refinement — keys
off `day_index` and is order-independent.

**Do this before the first invite batch.** There is no production data yet
(`issues/001-serve-app-subdomain.md` is still open), so this is a pure code
change. Once athletes have in-flight weeks it additionally needs a backfill of
`weeks.schedule` dates.

### Rejected: make onboarding speak `day_index`

Drop the weekday names and ask "which day of your training week do you rest?"
instead. Cheapest possible change, and wrong: the reason people rest on a
particular day is the job, the gym's hours, the family — all of which are
weekday-shaped. It would remove a real preference to avoid writing one modulo.

### Rejected: run week 1 short, to the end of the ISO week

Start today, end Sunday, and let week 2 onward be Monday-aligned forever. Also
correct, and cleaner in the steady state, but it makes `weeks` rows
variable-length — `completeWeek`, history and the week-analysis prompt all
currently assume seven days — for a benefit that lasts one week per athlete.

## Acceptance criteria

- [x] `isoWeekday(isoDate)` exists in `server/src/db/dates.ts` and is unit-tested
      across a full week, including the Sunday wrap
- [x] `buildScheduleFromTemplate` dates `day_index` by the rotation offset above,
      and returns `schedule` sorted by date
- [x] For a Monday `start` the emitted dates are byte-identical to today's
      output — a test pins this, so the change is provably a no-op for Monday
- [x] For a mid-week `start`, `day_index N` lands on ISO weekday `N`, and no day
      of week 1 is in the past — a frozen-clock test in
      `server/src/db/repositories/plans.test.ts` pins both
- [x] An athlete whose `rest_day` is 7 gets the `rest` day on a Sunday, on a
      mid-week activation, end to end from onboarding answers to `weeks.schedule`
- [x] Week 2's dates are assigned server-side by the same helper; the model is no
      longer asked to date anything and `strengthsync-workflow.ts:53` is gone
- [x] Week 2 uses the same rotation as week 1 — a test covers the second week of
      a Wednesday-anchored plan
- [x] `buildFirstPlanPrompt` states the `1 = Monday … 7 = Sunday` convention and
      instructs the model to place the rest day at `schedule_preferences.rest_day`
- [x] The tracker renders the week in date order with no client change
- [x] `docs/architecture/domain_model.md:108` documents the convention; the
      `rest_day` comment in `server/src/domain/onboarding/schema.ts` no longer
      warns that the two numberings differ; the entry is removed from
      `docs/future_state_after_mvp/todos.md`
- [x] `pnpm -r typecheck && pnpm -r lint && pnpm -r test` clean; no
      `gen:openapi` diff

## Blocked by

None — can start immediately.

Should land before `issues/008-launch-readiness.md` mints the first invite code,
after which it also needs a backfill of existing `weeks.schedule` dates.

## PRD sections addressed

None — this is a consequence of `issues/003-anchor-first-week-to-today.md`,
not a `docs/mvp.md` scope item. It is in `docs/kanban/` rather than `issues/`
for that reason.

## STATUS

DONE
