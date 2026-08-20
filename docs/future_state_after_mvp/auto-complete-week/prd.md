# PRD — Automate the weekly turnover

## Problem Statement

A training week ends on a date the system already knows. It is written on the
week row at the moment the week is created, it never moves, and nothing about it
depends on anything the athlete does. Yet the only way a week can end is for the
athlete to find a button labelled "Complete week" and press it.

Nothing tells them to press it. Nothing tells them what it does. Nothing tells
them what happens if they don't. It is a decision the athlete is asked to make
about their own plan, with no information, and there is only one correct answer —
which the system already has.

The consequence is not that the button goes unpressed. It is what the app does
when it goes unpressed. The current-week read filters on the date window as well
as the status, so the morning after a week ends the athlete's week stops being
returned even though it is still the live row in the database. The tracker reads
that absence as "this account has no plan", and shows an athlete who is four
weeks into a training block a welcome screen offering to build them their first
plan. Every athlete in the invited cohort will hit that screen in their second
week. Some of them will take the invitation and start a second plan on top of the
one they already have.

Separately, an athlete who does press the button gets a toast and nothing else.
The workflow behind it runs for thirty to sixty seconds of model calls and the
screen never updates, so even the athlete who does the right thing is left
looking at a week that is over, with no indication that anything is happening.

## Solution

The system ends the week, because the system is what knows when the week ends.

A scheduled job runs once a day and, for every athlete whose current week has an
end date in the past, starts the same turnover workflow the button starts today:
freeze the week, analyse it, generate the next one. The athlete does nothing and
is told nothing, because there is nothing to decide. They open the app and the
new week is there.

The job runs at midday UTC. That hour is not arbitrary: the athlete's last
training day must be over everywhere before their week is frozen, and midday UTC
is the only hour at which that is true for every timezone on earth. The cost is
that athletes in Europe get their new week in the early afternoon rather than at
breakfast, which leaves a window each week between the athlete's local midnight
and the job running.

In that window the tracker stops pretending the athlete has no plan. It tells
them the truth — this week is over, the next one is being built — and it keeps
the manual button, now as an escape hatch rather than a chore: the athlete who
does not want to wait until midday can pull the turnover forward themselves. That
is the only place the button appears. An athlete who finishes all seven days
early does not get it, because the week ends when it ends.

## User Stories

1. As an athlete, I want my week to end on its own when it is over, so that I do
   not have to know that ending a week is a thing I am responsible for.
2. As an athlete, I want to open the app the day after my week ends and find next
   week's training waiting, so that I can train that day without an administrative
   step first.
3. As an athlete, I want the app to never tell me I have no plan while I am in
   the middle of a plan, so that I do not lose trust in it.
4. As an athlete, I want to never be offered "build your plan" when I already
   have one, so that I cannot accidentally start a second plan on top of my first.
5. As an athlete who opens the app in the window between my week ending and the
   job running, I want to be told my week is over and the next one is coming, so
   that I understand nothing is broken.
6. As an athlete in that window who does not want to wait, I want a way to
   trigger the turnover myself, so that I can train this morning rather than this
   afternoon.
7. As an athlete who has triggered it myself, I want to be told it has started,
   so that I do not press it repeatedly.
8. As an athlete waiting for a week to be built, I want a way to check whether it
   is ready yet, so that I am not forced to reload the whole app.
9. As an athlete, I want the new week to start the day after my last one ended,
   so that my training dates stay continuous and my week always contains today.
10. As an athlete who trains on a schedule anchored to the day I signed up, I want
    the turnover to happen on my own boundary rather than on a fixed weekday, so
    that my week is seven days long every time.
11. As an athlete who trains in the evening, I want my last training day to be
    fully over before my week is frozen, so that a session I did on the last day
    still counts towards the analysis that builds my next week.
12. As an athlete who skipped days, I want my week to roll over anyway, so that a
    bad week does not leave me stuck on it forever.
13. As an athlete who logged nothing at all, I want a new week to be generated
    regardless, so that returning after a bad week means opening the app rather
    than asking for help.
14. As an athlete who finished all seven days early, I want to wait for my week to
    end rather than being invited to skip ahead, so that my training boundary
    stays predictable week after week.
15. As an athlete, I want to see one screen when I have no plan and a different
    screen when my plan is between weeks, so that the app's empty states mean
    distinct things.
16. As an athlete mid-generation, I want the app to not appear frozen, so that I
    can put my phone away and come back.
17. As an athlete, I want no button in my week header asking me to complete
    anything, so that the tracker is about training rather than about the app.
18. As the operator, I want the turnover to happen without me, so that the product
    works for twenty invited athletes without twenty acts of attention.
19. As the operator, I want the job to cover every athlete whose week has ended
    regardless of which weekday that is, so that no cohort member is left behind
    for days because their boundary fell on a Tuesday.
20. As the operator, I want a week that is due to stay due until it is actually
    turned over, so that a failure before the freeze is retried by the next day's
    run without my involvement.
21. As the operator, I want two runs on the same day to be incapable of starting
    two turnovers for one athlete, so that I never pay twice for a week or corrupt
    one.
22. As the operator, I want one athlete's failure not to abort the run for
    everyone else, so that a single bad row cannot cost the whole cohort their
    week.
23. As the operator, I want the run to record how many weeks were due and how many
    turnovers it started, so that I can tell a quiet day from a broken job.
24. As the operator, I want failed turnovers visible in the Cloudflare Workflows
    dashboard with their step history, so that I can diagnose one without adding
    an alerting stack to the MVP.
25. As the operator, I want the manual trigger to survive as an escape hatch, so
    that I can unblock a specific athlete over a call without a database session.
26. As the operator, I want to keep a signal for athletes who manually triggered
    the turnover, so that I can see whether the escape hatch is being used and
    whether the midday window is a real irritation.
27. As the operator, I want to be able to fire the job by hand locally, so that I
    can exercise the whole path without waiting for midday.
28. As the operator, I want the job to be one query and one batch at cohort scale,
    so that it costs nothing and finishes well inside the scheduled invocation.
29. As a developer, I want the sweep's logic to live in a module that takes a
    database and a workflow binding and returns a summary, so that the scheduled
    entry point is thin and the behaviour is readable in one place.
30. As a developer, I want the "which weeks are due" question answered by a single
    repository function, so that there is exactly one definition of due and it can
    be tested against a frozen clock.
31. As a developer, I want the tracker's three states to be explicit, so that the
    difference between "no plan" and "between weeks" is visible in the code rather
    than implied by a null.
32. As a developer, I want the week header component to disappear rather than
    linger as an empty wrapper once the button moves, so that the component tree
    does not accumulate shells.

## Implementation Decisions

### Trigger

- A daily Cloudflare Cron Trigger on the existing Worker, with a scheduled
  handler alongside the existing fetch handler. No new Worker, no queue, no
  external scheduler.
- **Daily, not weekly.** Training weeks are anchored to the day the athlete's
  plan was activated and chain forward from there, so boundaries land on all
  seven weekdays across a cohort. A weekly job would catch one seventh of
  athletes on time and leave the rest waiting up to six days.
- Rejected: a self-scheduling workflow that sleeps until its own week ends and
  loops. Attractive — no enumeration query, exactly-once by construction, and
  sleeping instances do not count against concurrency — but it leaves one
  long-lived instance per athlete pinned to the code version it started on, so a
  sleeper wakes into whatever was deployed a week ago.
- Rejected: triggering lazily when the athlete next opens the app. Cheap, but the
  turnover then only happens for athletes who show up, and a returning athlete
  needs several sequential turnovers before they see anything.
- Rejected: triggering when the last day of the week is saved. It never fires for
  anyone who skips a day, which is most athletes, so it needs a scheduled job
  underneath it regardless.

### When a week is due

- Due means: the week's status is in-flight and its end date is strictly earlier
  than today, in UTC. Dates in this system are UTC ISO day strings throughout.
- **The job runs at 12:00 UTC.** Every timezone on earth lies between UTC-12 and
  UTC+14, so at midday UTC the athlete's last calendar day is already over
  locally everywhere — the job can never cut a training day short. The worst case
  is a turnover that lands late, not early.
- Rejected: running just after midnight UTC. It would give European athletes their
  week at breakfast, but it freezes the week five to eleven hours early for anyone
  in the Americas. Correct only for as long as the cohort's geography is
  controlled, which is not a property to build on.
- Rejected: storing an IANA timezone per athlete and rolling at each athlete's
  local midnight. Correct everywhere and reduces the gap to under an hour, but it
  costs a profile column and migration, timezone-aware date helpers, an onboarding
  capture, and twenty-four runs a day instead of one.
- Rejected: a full grace day before freezing. Safe at any hour, but it leaves the
  athlete a whole day past their week end with nothing new.

### The sweep

- A job module that takes a database handle, the workflow binding and today's
  date, and returns a summary of how many weeks were due, how many turnovers were
  started, and how many failed. All of the behaviour lives here; the scheduled
  handler constructs the database and calls it.
- Enumeration is a new repository function on the weeks repository that returns
  every due week. This is the first cross-tenant read in a repository layer where
  every other function is scoped to one athlete, and it is deliberate: the sweep
  is a system-level job with no athlete in context. It carries a comment saying so
  in those terms, so it is not read as a missed scope check.
- Instances are created in one batch call for the whole due set. Per-instance
  failures are caught so that one athlete cannot abort the run for the rest.
- The run logs its summary. Nothing else is added for observability.

### Idempotency

- Each instance is created with an explicit id derived from the week's id and
  today's date. Two runs on the same day therefore cannot start two turnovers for
  one week, while a week that failed before it was frozen is still in-flight, is
  still due tomorrow, and gets a fresh id then.
- Rejected: using the week id alone as the instance id. Tidier, and exactly-once
  for the lifetime of the week — but a turnover that failed before the freeze
  would be permanently and silently unretryable, which is the worst available
  failure.
- No lock is needed on top of this. The freeze is already a conditional update
  that returns the row it changed, so it is a compare-and-swap: of two concurrent
  turnovers exactly one proceeds. The weeks table also already carries a unique
  partial index allowing at most one in-flight week per athlete, so a duplicate
  next week cannot be inserted.

### Failure

- The workflow's existing order is unchanged: the week is frozen first, then
  analysed, then the next week is generated and saved.
- A run that fails after the freeze leaves the athlete with no in-flight week. The
  sweep cannot see them — they no longer match the due query — and they stay that
  way until noticed. This is accepted for the MVP cohort. Diagnosis is the
  Cloudflare Workflows dashboard, which lists failed instances with their step
  history; recovery is by hand.
- Rejected for now: reordering the workflow so that analysis and generation happen
  first and the freeze plus the next week's insert are committed together in a
  single atomic batch. This is the correct shape for unattended work — every
  failure becomes a no-op that the next day's run retries, and the existing unique
  index makes a concurrent double-commit fail loudly rather than duplicate. It was
  weighed against the size of the restructure and deferred.
- Rejected: making the freeze fall back to the most recently completed week when
  there is no in-flight one, so that re-running an instance transparently resumes
  a stranded athlete. Cheaper than reordering, but it leaves a repository function
  whose name no longer describes what it does and a sweep with two notions of due.
- Rejected: a server-side analytics event or any other alerting channel. The
  server has no analytics client today and adding one would make product analytics
  load-bearing for operations.

### The tracker

- The current-week read is unchanged. No server or contract change is needed for
  the gap state, because the tracker already loads the active plan alongside the
  current week and the two together distinguish the cases:
  - no active plan → the existing welcome screen, offering to build a first plan;
  - an active plan but no current week → the gap: this week is over, the next one
    is being built;
  - an active plan and a current week → the tracker.
- The gap state carries the manual trigger and a "check again" control that
  invalidates the cached tracker read and re-fetches.
- **This is the only place the manual trigger appears.** It is removed from the
  week header, which then renders nothing and is deleted.
- An athlete who has logged all seven days before their week ends does not get the
  trigger. Pulling the next week forward would permanently shift that athlete's
  boundary earlier, because each week chains off the previous week's end date —
  which would undo the predictability this work exists to establish.

### Completion feedback

- Fire and forget. The trigger starts the workflow, reports that it started, and
  does not follow it. The athlete presses "check again" when they want to know.
- The existing pending state on the trigger, currently disabled, is restored so
  that the control reflects the request it is making.
- Rejected: polling the current-week read on a timer until a new week appears. It
  would cover both the manual and scheduled paths identically and needs no new
  contract, but it adds a timer and a timeout state for the benefit of the athlete
  who is standing there watching.
- Rejected: a workflow status endpoint. It would distinguish "still running" from
  "failed", but it needs a new route, schemas and a regenerated contract, and it
  only ever helps the manual path — the scheduled run's instance id never reaches
  a browser.

### Analytics

- The existing "week completed" funnel event stays where it is, on the manual
  trigger, and now means "the athlete triggered the turnover manually" rather than
  "a week was completed".
- Its volume will collapse and its meaning changes. This is recorded here so that
  a near-zero step in the funnel is read as an instrument that changed, not as
  catastrophic drop-off. The MVP's success metric does not depend on it.
- Rejected: re-pointing it to fire when the tracker first renders a higher week
  index — a genuine week-two return signal, client-side, no server key.
- Rejected: deleting it along with the funnel step.

### Dormancy and cost

- No gate. Every athlete with a plan rolls over every week whether they logged
  anything or not, including an athlete who has stopped opening the app entirely.
- At the invited cohort's size this is cents per week on the current model, and
  the OpenAI monthly spend cap is the real backstop. The analysis prompt already
  treats unfinished days as reduced adherence, so a dormant athlete's weeks
  deload rather than progress.
- A gate is worth adding before any larger cohort, either by cloning the previous
  week forward with no model call when nothing was logged, or by pausing
  generation until the athlete returns.

## Testing Decisions

A good test here pins behaviour an athlete or the operator could observe, and
says nothing about how the code is arranged. It should survive a rewrite of the
module it covers. Concretely: which weeks a run picks up, and what the athlete
sees on screen in each of the three states. Not: how the query is composed, which
helper is called, or what the summary object's shape is internally.

Tested:

- **The due-weeks query.** A repository test with a frozen clock, pinning that a
  week ending today is not yet due, a week ending yesterday is, that completed
  weeks are never returned, and that weeks belonging to different athletes all
  come back. This is the single definition the whole feature rests on, and it is
  entirely about a date boundary, which is exactly what a frozen clock is for.
  Prior art: the frozen-clock repository tests added for anchoring the first week
  to the activation day, which established the pattern of faking only `Date` for
  a mid-week scenario. Without freezing, this test would assert nothing on the one
  day of the week the old and new behaviours agree.

- **The tracker's three states.** Extending the existing tracker page test: no
  plan renders the build-your-plan invitation; a plan with no current week renders
  the gap card carrying the manual trigger; a plan with a current week renders the
  tracker. This pins the exact regression that motivates the work — a mid-plan
  athlete being offered a first plan — and it is behaviour, stated in what the
  athlete sees.

Not tested, deliberately:

- **The sweep module.** Its instance-id format and its per-athlete failure
  isolation will be verified by reading and by the first real run rather than by a
  test against a fake workflow binding. Accepted with the consequence understood:
  a regression in either would be silent until a cohort missed a turnover.
- **The scheduled handler's wiring.** It asserts a connection the typechecker
  largely covers, and Cloudflare's cron delivery cannot be exercised locally
  anyway.

The pre-commit hook — typecheck, lint, test — is the completion gate for each
slice, as for every other issue in this repository.

## Out of Scope

- Any change to the current-week read or to the week API contract. The gap state
  is derived on the client from data it already fetches.
- Polling, a workflow status endpoint, or any live progress indication during
  generation.
- Alerting, notification, or automatic recovery of a stranded athlete.
- Restructuring the workflow so that the freeze and the next week's insert commit
  atomically at the end.
- Storing an athlete timezone, and any timezone-aware date handling.
- A dormancy or cost gate on generation.
- Triggering the turnover from a day being saved, or from a week being fully
  logged before its end date.
- Changing what the next week's start date is when a turnover happens late.
- Re-pointing or removing the "week completed" funnel event.
- The pending work to make the day index mean an ISO weekday again. It is queued
  for the same pre-invite window and touches the same week-dating code, but it is
  a separate change with its own plan.
- Any backfill of existing week rows. There is no production data yet.

## Further Notes

**Sequencing.** This should land before the first invite batch goes out. The gap
bug is live today and independent of automation: every athlete in the cohort would
hit the "no training plan on your account" screen in their second week. The
remaining launch item is a no-code checklist, so this is not blocked by anything.

**Accepted consequences**, recorded so they read as decisions rather than
oversights:

1. A session trained on the last day of a week but logged the following morning is
   lost. The week is not rendered during the gap, and triggering manually freezes
   it immediately.
2. European athletes spend roughly fourteen hours a week on the gap screen, from
   local midnight until the job runs. This is the price of the midday hour, which
   is what guarantees no athlete anywhere loses a training day.
3. A stranded athlete — one whose turnover failed after the freeze — is invisible
   to the sweep and stays stranded until noticed.
4. A strand fixed by hand several days later produces a next week starting in the
   past, because each week is dated from the previous week's end. That is the same
   defect that anchoring the first week to the activation day set out to remove,
   reachable again through the manual recovery path.

**Local verification.** The scheduled handler can be fired on demand against the
local Worker rather than waiting for midday, so the whole path — due query, batch
creation, workflow run, new week appearing in the tracker — can be exercised in
one sitting.

**Scale.** One query and one batch per day. Cloudflare's limits are not close:
sleeping and queued instances do not count against concurrency, and the cohort is
twenty athletes. The due query is not indexed for its own shape and scans the
weeks table; at this size that is irrelevant, and it is the kind of thing to
revisit only if the cohort grows by orders of magnitude.
