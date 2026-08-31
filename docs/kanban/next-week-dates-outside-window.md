# A late turnover writes a week the API reports as absent

Found while fixing the stuck `Analyzing…` spinner
(`docs/architecture/workflows.md`, "Reporting the run"). It is a second,
independent way an athlete stays on "Your training week is over" — and unlike
the spinner, this one survives a hard reload.

## The two halves

`saveNextWeek` starts the new week the day after the old one ended
(`server/src/db/repositories/weeks.ts:191`):

```ts
const startDate = addDays(previousWeek.end_date, 1);
```

`getCurrentWeek` answers `null` outside the week's own window
(`server/src/db/repositories/weeks.ts:30-35`):

```ts
if (today < week.start_date || today > week.end_date) return null;
```

Put together: the new week is dated from the *old* week's calendar, not from
the day the turnover actually ran.

## What breaks

- **Late.** An athlete who presses Complete week eight or more days after the
  week ended gets a real `in_flight` row whose window has already passed.
  `GET /api/me/weeks/current` answers 404. The tracker shows
  `BetweenWeeks` again — with a Complete week button that would now freeze the
  brand-new, untouched week.
- **Early.** An athlete who completes the week before its `end_date` gets a
  week that has not started yet. Same 404, same screen, same button.

Both cases pass the turnover status poll: the workflow status is `complete`,
because the workflow did exactly what it was told.

## The fix, roughly

Anchor the new week to the day the turnover runs when the previous week has
already ended:

```ts
const dayAfter = addDays(previousWeek.end_date, 1);
const startDate = dayAfter < todayIso() ? todayIso() : dayAfter;
```

The same anchor has to reach `buildNextWeekPrompt`'s `nextWeekStart`
(`server/src/workflows/strengthsync-workflow.ts:194`), or the prompt and the
row disagree about what week the model is writing.

The early case needs a decision, not just an anchor: either refuse the trigger
before `end_date`, or accept that a completed-early week shortens the block.

---

## Category

**2. Bug** — the workflow succeeds and the athlete still cannot train.

## Priority

**2. High.** It is narrower than the spinner: it needs a turnover that is more
than seven days late, or one that is early. But the `docs/mvp.md` cohort runs
for two weeks with a manual button, so both are reachable, and the failure is
silent — the status poll says `complete`.

Related: [automate-week-turnover.md](automate-week-turnover.md) covers the same
date window from the other side, and its scheduled midday-UTC job would make
the late case rare rather than fixing it.
