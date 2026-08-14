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

- [ ] A plan activated on any weekday produces a first week whose `start_date` is
      that day and whose `end_date` is that day + 6
- [ ] `day_index` 1 of the generated template maps to the start date, and the
      remaining days follow sequentially
- [ ] No day of the first week is ever in the past at activation time
- [ ] Week 2 still starts the day after week 1 ends, for a non-Monday start
- [ ] A repository test pins the behaviour for a mid-week activation

## Blocked by

None — can start immediately.

## PRD sections addressed

- Scope item 3 (First week anchored to today)
- Supersedes the "possible bug" entry in `docs/future_state_after_mvp/todos.md`

## STATUS

TODO
