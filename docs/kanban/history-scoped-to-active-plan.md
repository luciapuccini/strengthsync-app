# History only ever shows the current plan, so a new plan looks like amnesia

Your note is that history compares weeks *within* a plan, and a new plan resets
the view. That is exactly what the code does, and it is deliberate rather than
accidental — `client/src/api/historyResource.ts` documents the trade in its own
doc comment ("there is no way to view an archived plan's history"). The data is
not lost; only the read is scoped.

## Where the scoping happens

Three layers, only one of which actually needs changing:

| Layer | Today | Blocking? |
|---|---|---|
| `listWeeks` (`server/src/db/repositories/weeks.ts:40`) | `planId` and `status` are both optional filters | No — already supports all-time |
| `GET /api/me/weeks` (`server/src/routes/weeks/endpoints.ts:113`) | `planId` optional in the query schema | No |
| `listCompletedWeeks` (`client/src/api/client.ts:210`) | requires a `planId`, and `completedWeeksResource` resolves it from the *active* plan | **Yes** |

Plan turnover sets the previous plan to `status: 'archived'`
(`server/src/db/repositories/plans.ts:116`) and leaves its `weeks` rows untouched,
each still carrying its own `plan_id`. So every completed week the athlete has
ever logged is one unfiltered query away. Dropping the `planId` argument is a
two-line change.

## What breaks if you just drop the filter

The screen is built on plan-relative coordinates, which is the real work here:

- **`week_index` restarts at 1 with each plan.** `historyPage.tsx` renders it as
  `Week S{week_index} / S{total_weeks}`. Concatenate two plans and the pager
  reads S1, S2, S3, S4, S1, S2 — and there are now two "S1"s to compare against.
- **`total_weeks` comes from the active plan** and is passed into `toWeekHistory`
  wholesale, so archived weeks would be labelled with the current plan's length.
- **The week-over-week delta assumes adjacency within one block.** `toWeekHistory`
  diffs by `exercise_key` against the previous week. Across a plan boundary the
  exercise set can change entirely: the first week of plan 2 would show every
  lift as new, or diff against a movement the athlete stopped doing weeks ago.
- **The pager is linear.** One "Previous / Next" pair over a flat list of weeks
  works for four to eight weeks. It does not work for a year.

## The [TBD] in your note is the actual decision

You wrote "per week or day type or per exercise [TBD]" — that is the design
question, and it is what makes this bigger than the filter change. The three axes
want different screens:

- **Per week** is what exists today; unscoping it needs the coordinate fixes above
  and nothing else.
- **Per day type** (`upper_body | leg_day | full_body | activity | cardio | rest`)
  is a grouping the data supports directly — `HistoryDaySchema` already carries
  `day_type` — but it is a different page, not a wider version of this one.
- **Per exercise** is the one athletes actually mean by "history": pick
  `press_banca`, see every load ever logged for it, on a line. That is a
  time-series read across all plans keyed on `exercise_key`, and it makes the
  plan boundary irrelevant instead of merely tolerable. It is also the version
  that wants a chart rather than a pager.

Recommendation when this comes up: build the per-exercise view as the answer,
and let the per-week pager stay plan-scoped and honest about it. Trying to make
one screen do both is what produces the `week_index` collision above.

Related: `docs/future_state_after_mvp/stats.md` covers neighbouring ground and
should be read before this is sliced.

---

## Category

**3. Enhancement** — an idea from development, out of current scope, and
explicitly unrefined in your own note. The scoping is a documented decision, not
a defect, so this is a widening rather than a fix.

---

## Priority

**2. Can wait** — and unusually cleanly, because it is *unreachable* during the
MVP window. A plan is 4 to 8 weeks (`total_weeks` in
`server/src/domain/workflow.ts:19` is `min(4).max(8)`), and `docs/mvp.md` closes
the experiment after **two weeks**. No athlete in the invited cohort reaches
plan turnover, so no athlete in the cohort ever sees history reset. The symptom
cannot occur before the exit criterion is read.

The moment it matters is the moment the first cohort athlete finishes a plan —
which is also the first moment there is real multi-plan data to design the
per-exercise view against, rather than guessing at it now.

---

## Original note

> history only compares weeks in a plan, new plan resets history view. This should
> always compare all data available, so per week or day type or per exceersice
> [TBD] bigger feature.
