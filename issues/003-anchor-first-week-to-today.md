# 003 — Anchor the first training week to today

## Parent PRD

`docs/mvp.md`

## What to build

Make the first week of a newly generated plan start on the day the athlete signs
up, instead of on the Monday of the current ISO week.

`activateGeneratedPlan` (`server/src/db/repositories/plans.ts:80`) currently pins
week 1 to `startOfISOWeek(todayIso())`. Sign up on a Friday and days 1–4 of the
plan are already in the past — days the athlete never trained and cannot log.
Roughly five in seven new users land in that state, and lifting days usually fall
Monday/Wednesday/Friday, so most of them open the tracker to a week that is
mostly spent. That is a direct attack on the MVP's success metric, which is why
this moved out of the post-MVP list.

The fix belongs in the repository, not the prompt: `buildFirstPlanPrompt` sends
only `{coaching_rules, profile}` and the model emits a `day_index` 1–7 template
with no notion of dates. Setting `start` to today and `end` to today + 6 maps
that template onto the next seven days.

Week 2 onward already chains off `completedWeek.end_date + 1`
(`server/src/workflows/strengthsync-workflow.ts`), so the offset stays consistent
for that athlete forever and needs no change.

See `docs/mvp.md` §3.

## Acceptance criteria

- [x] A plan activated on any weekday produces a first week whose `start_date` is
      that day and whose `end_date` is that day + 6
- [x] `day_index` 1 of the generated template maps to the start date, and the
      remaining days follow sequentially
- [x] No day of the first week is ever in the past at activation time
- [x] Week 2 still starts the day after week 1 ends, for a non-Monday start
- [x] A repository test pins the behaviour for a mid-week activation

## Implementation note

One line: `start` in `activateGeneratedPlan` is `todayIso()` instead of
`startOfISOWeek(todayIso())`. `buildScheduleFromTemplate` already dates each day
as `start + (day_index - 1)`, and `saveNextWeek` already chains off
`previousWeek.end_date + 1`, so nothing else moved.

`startOfISOWeek` had no other caller and was deleted from `server/src/db/dates.ts`
along with its tests; the file's header no longer claims weeks run Monday–Sunday.

The repository test freezes the clock (`vi.setSystemTime`, `toFake: ['Date']`) to
a Wednesday. Without that it would assert nothing every Monday, which is the one
day the old and new behaviour agree — worth the first fake timer in the server
suite. Both new tests were confirmed to fail against the old anchor before the
change was kept.

### Known consequence: `day_index` stopped meaning a weekday

Onboarding collects the "usual rest day" by name and stores it as
`schedule_preferences.rest_day` on `1 = Monday` (`ONBOARDING_WEEKDAYS` in
`client/src/lib/onboarding-schema.ts`). That value goes into the profile the
first-plan prompt reads, and the model places `type: "rest"` at the matching
`day_index`. With week 1 anchored to the activation day, `day_index 1` is that
day rather than Monday, so someone signing up on a Wednesday who rests on
Sundays now rests on a Tuesday — and the offset chains forward through every
later week, because week 2's prompt dates `day_index 1` as
`completedWeek.end_date + 1`.

Left in place deliberately: a rest day on the wrong weekday is a smaller problem
than a week whose first days are already spent, and fixing it is a product
decision about whether `day_index` means "your Nth day" or "a weekday" — not
something to settle inside this issue. Recorded in
`docs/future_state_after_mvp/todos.md`, and the now-false comment on
`OnboardingAnswersSchema.rest_day` was corrected to point at it.

## Blocked by

None — can start immediately.

## PRD sections addressed

- Scope item 3 (First week anchored to today)
- Supersedes the "possible bug" entry in `docs/future_state_after_mvp/todos.md`

## STATUS

DONE
