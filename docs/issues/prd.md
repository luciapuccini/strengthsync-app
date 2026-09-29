# PRD — Give the tracker a week header, and put "Complete week" in it

## Problem Statement

The tracker is the screen an athlete opens most, and it is the only main screen
that does not say what it is showing. There is no week number, no block position,
no date range, and no indication of how much of the week has been recorded. The
history screen states all of that in one line at the top. The tracker states
none of it. An athlete four weeks into a block opens the app and sees seven
collapsible days with dates on them, and nothing that says which week this is or
how it is going.

That missing header is also why the "Complete week" button looks wrong.

The button appears only once the week's end date has arrived. With no header to
belong to, it is placed in the empty space between the app chrome and the card
that holds the days. It is a small, brand-coloured pill, aligned left, floating
against a dark background, with no label above it and no sentence beside it. It
does not read as the conclusion of anything. It reads as something that was left
behind.

Next to it, every day carries a "Save day" button. On a seven-day week that is
seven controls shaped like commitments, plus one more. They look alike and they
are not alike: saving a day is local and can be done again, while completing a
week freezes the log, spends thirty to sixty seconds of model calls, and is the
act that produces next week. The terminal action is the smallest control on the
screen and sits furthest from the days it acts on.

The colour makes a third claim, and on some weeks it is false. The button is full
brand accent, which makes it the loudest element on the screen. On a week where
the athlete recorded nothing at all — every exercise still showing its full set
count, no day marked done — the screen presents closing that week as the obvious
and positive next step. It is neither. It is a week with no results, and the
analysis that builds the next week will be given an empty log to read.

This state is live. The account used to review this work had exactly it: the week
ended the same day, and not one set had been logged.

## Solution

The tracker gets a header, and the header owns the week-level action.

The header is always present. It names the week and its position in the block,
gives the date range, and states progress as a count of training days recorded
out of training days planned. Rest days are not counted on either side of that
ratio, because a rest day holds no result to record and counting it would report
a week as part-finished before the athlete has trained once.

The right side of the header has one slot, and it always holds something. Before
the week's end date it holds a quiet line saying which day the week ends on.
From the end date onward it holds the "Complete week" trigger. The header does
not appear, disappear, or change height between those states — only the contents
of that one slot change.

This gives the app one rule an athlete can learn without being told: **each level
owns its action in its own header.** The day header holds "Save day". The week
header holds "Complete week". Nothing is left floating between two containers,
and the terminal action finally sits at the top of the thing it terminates,
beside the number that says how much of that thing was actually done.

When the week ends with nothing recorded, the screen stops recommending the
action without taking it away. The trigger drops to a quiet outline style and
stays enabled, and one plain sentence states what will happen: next week will be
built from the plan rather than from results. The athlete keeps the ability to
close the week. The app stops pretending that closing it is a success.

The week-over case therefore stops being a separate view bolted onto the normal
one. It becomes a state of the normal view, which is what made the floating
button feel foreign in the first place.

## User Stories

1. As an athlete, I want the tracker to say which week of my block I am looking
   at, so that I know where I am in a plan that runs for several weeks.
2. As an athlete, I want to see how many weeks my block has in total, so that I
   can tell how much of it is behind me.
3. As an athlete, I want the week's date range on screen, so that I do not have
   to read the date on each day row to work out which week this is.
4. As an athlete, I want to see how many training days I have recorded this week,
   so that I know how I am doing without opening every day.
5. As an athlete, I want that count to ignore rest days, so that a number like
   "2 of 5" describes training I did rather than days that passed.
6. As an athlete, I want the same header on every week, so that the tracker looks
   like one screen rather than two.
7. As an athlete mid-week, I want to know which day my week ends on, so that I
   can plan the rest of my sessions around it.
8. As an athlete mid-week, I want no action asking me to complete anything, so
   that the tracker stays about training while there is still training left.
9. As an athlete whose week has ended, I want the way to close it to be part of
   the week's own header, so that it is obviously about the week rather than
   about the app.
10. As an athlete, I want the action that ends my week to sit next to the count of
    what I recorded, so that I can see what I am about to submit before I submit
    it.
11. As an athlete, I want the week-level action to look different from the
    per-day action, so that I do not read a reversible save and an irreversible
    turnover as the same kind of button.
12. As an athlete, I want nothing floating in the gap above the week card, so
    that every control on the screen belongs to something I can see.
13. As an athlete who recorded nothing this week, I want the app to say so
    plainly, so that I am not told a week went well when it did not.
14. As an athlete who recorded nothing, I want the app to tell me what next week
    will be built from, so that I understand the consequence before I act.
15. As an athlete who recorded nothing, I want the closing action to stay
    available, so that a bad week cannot trap me on it.
16. As an athlete who recorded nothing, I want that action to stop being the
    brightest thing on the screen, so that the app is not congratulating me for a
    week I did not train.
17. As an athlete who did record training, I want the closing action to stay
    prominent, so that the step I have earned is easy to find.
18. As an athlete, I want the header to keep its shape as the week progresses, so
    that the screen does not jump on the day my week ends.
19. As an athlete on a phone, I want the header to wrap rather than crush the
    week name against the action, so that both stay readable on a narrow screen.
20. As an athlete on a phone, I want the closing action to keep a comfortable
    touch target, so that I do not miss it or hit it by accident.
21. As an athlete using a screen reader, I want the week name to be the page
    heading, so that I can jump to it and know what screen I am on.
22. As an athlete, I want the numbers in the header to line up as they change, so
    that the count does not shift the text beside it.
23. As an athlete, I want the tracker header and the history header to state a
    week the same way, so that I recognise the same information in both places.
24. As an athlete who presses the closing action, I want it to disable itself and
    say it is working, so that I do not start the turnover twice.
25. As an athlete between weeks, I want the screen that has no current week to
    keep working exactly as it does now, so that nothing I already rely on
    changes.
26. As an athlete with no plan at all, I want the welcome screen to be untouched,
    so that first-run stays as it is.
27. As a developer, I want the rule for counting recorded days to live in one
    testable function, so that the header, and anything later that needs the same
    number, cannot disagree about it.
28. As a developer, I want that function to take a week and return plain values,
    so that it can be tested without a browser, a store, or a rendered component.
29. As a developer, I want the weekday name to come from a fixed locale, so that
    the same week produces the same text on every machine and the test can assert
    it.
30. As a developer, I want the week component to stop branching on whether the
    week is over, so that its layout is the same code on every week.
31. As a developer, I want the closing control to take its appearance from a
    prop rather than reading state itself, so that the screen decides how loud it
    is and the control stays about starting the turnover.
32. As a developer, I want the between-weeks screen to keep using that control
    unchanged, so that adding an appearance option costs its existing caller
    nothing.
33. As the operator, I want the empty-week case to be visible on screen, so that
    an athlete who did nothing for a week is a thing the product states rather
    than something only the database knows.

## Implementation Decisions

### The header

- The header is part of the week view and renders on every week, not only on a
  week that has ended. A header that appears on one day of seven is a second
  layout, and a second layout is what the floating button already was.
- It states three things: the week's index and the block's total length, the
  week's date range, and progress as recorded training days out of planned
  training days.
- The week index and block length come from data the screen already holds. No
  new read, no contract change, no server work.
- The block length is rendered only when an active plan is present. The tracker
  rules out a missing plan and a missing week together, not separately, so a week
  without a plan is possible in the type and the header must not assume one.
- The week name is the page heading. The tracker currently has no heading at all,
  so this also gives the screen its first landmark.
- Dates use the existing date formatter rather than a new one. Numbers use
  tabular figures so the progress count does not reflow the text beside it as it
  changes.
- The header is one wrapping row. On a narrow screen the action drops below the
  week name instead of compressing it.

### The action slot

- One slot on the right, always occupied, two possible occupants: a quiet line
  naming the day the week ends on, or the closing trigger. Which one is decided
  by the same date comparison the screen uses today.
- The slot is the only place the trigger appears on the week view. The bare
  wrapper above the week card is deleted rather than restyled.
- The between-weeks screen keeps its own copy of the trigger and is not changed.
  That screen is reached when there is no current week at all, which is a
  different situation from a current week that has run out of days.
- Rejected: putting the trigger at the end of the day list, as a closing row
  inside the card. It matches reading order and sits directly under the days it
  acts on, but it costs a full scroll of a very long page to reach, and it leaves
  the header with an empty slot that has nothing to say.
- Rejected: reusing the between-weeks panel above the card for this state. It is
  the smallest possible change and it removes a duplicated pattern, but it stacks
  a second bordered block on top of an already tall card and still leaves the
  week itself unnamed.

### Counting recorded days

- Progress is a ratio of training days, and a training day is any day that is not
  a rest day. Both sides of the ratio exclude rest days.
- Rejected: counting all seven days. It inflates the denominator and, worse, lets
  the numerator rise on days when nothing was trained, so the number stops
  describing training.
- A day counts as recorded when it carries the same completion flag the day
  header already renders as a "Done" badge and the day block already uses to
  decide whether to start collapsed. There is no second definition of done.
- The weekday name for the end date is produced with a pinned locale rather than
  the ambient one. The app already prints dates in a single fixed format, and a
  fixed locale is also what makes the value assertable in a test.
- All of this lives in one pure function that takes a week and returns the two
  counts and the weekday name. It has no React, no store access, and no
  formatting of its own beyond that name. This is the only new logic in the
  change and it is deliberately the only part that can be tested in isolation.
- The function is placed beside the tracker page, mirroring where the history
  screen keeps its own pure transform. Same shape, same reason.

### The empty week

- The trigger stays enabled when nothing was recorded. Disabling it would strand
  an athlete on a week they cannot close, and a bad week must not become a
  permanent one.
- It changes appearance instead. A quiet outline replaces the filled accent, so
  the screen stops nominating it as the obvious next step while leaving it
  exactly as reachable.
- The closing control gains an optional appearance setting for this, defaulting
  to its current filled style. Its existing caller passes nothing and is
  unchanged. The control does not decide its own loudness; the screen does,
  because the screen is what knows whether the week earned it.
- A single sentence appears below the header row, only on a week that has ended
  with nothing recorded, stating that the next week will be built from the plan
  rather than from results. It is quiet body text, not a warning banner, because
  it reports a fact rather than blocking an action.
- Rejected: a confirmation dialog before running on an empty week. It guards an
  irreversible and paid operation, which is a real argument, but it adds a modal
  to the one flow the athlete least wants friction in, and the softened styling
  plus the stated consequence already carry the information a dialog would.
- Rejected: hiding the trigger entirely on an empty week. It removes the only way
  to move forward and converts a bad week into a dead end.
- Accent budget is part of this decision, not a side effect. The week card
  already carries accent-tinted day badges and the navigation carries an accent
  active state. Spending the brightest token in the palette on an action the
  athlete has not earned is what made the original button feel like it was
  shouting.

### What is not being built

- No server change, no API change, no contract regeneration. Every value the
  header shows is already on the client.
- No change to how a week is completed, to the workflow it starts, or to the
  analytics event it fires.

### Superseded decisions

An earlier PRD on automating the weekly turnover held decisions that contradict
this one: that the trigger must not appear in a week header, that the week header
should be deleted once the trigger moved, and that the between-weeks card was the
only place the trigger could appear. Those decisions are stale and are not
honoured here. That file has since been removed from the repository, so this
document is the current authority on where the week-level action lives.

`docs/kanban/automate-week-turnover.md` still exists and still points at the
removed file. It also reports a defect in the closing control — a commented-out
pending flag — that is fixed in the code today. Both are noted here so the card is
read as out of date rather than as a live instruction; neither is corrected as
part of this work.

## Testing Decisions

A good test here pins something an athlete could observe and stays silent about
how the code is arranged. It should survive the component being rewritten. The
rules worth pinning are the ones a reader cannot confirm by looking: which days
count towards progress, what makes a day count as recorded, and what the end-date
weekday resolves to.

Tested:

- **The week-summary function.** One focused test covering three rules. Rest days
  are absent from both the numerator and the denominator, so a week of two rest
  days and five training days reports out of five rather than out of seven.
  A day counts as recorded when and only when it carries the completion flag.
  The weekday name for a known ISO date is the expected day, which is meaningful
  only because the locale is pinned. These three are the whole of the new logic,
  and none of them can be checked by reading the header markup.

  Prior art: the history screen's pure transform and its colocated test. Same
  placement, same shape — a plain function over a week, tested with no React, no
  store and no router.

Not tested, by decision:

- **The header's rendered output.** Which slot holds which occupant is one date
  comparison already used on this screen, and what the header prints is the
  function's output passed straight through. A rendering test here would mostly
  assert that strings were interpolated. The existing tracker page test already
  renders the whole page, so a header that throws still fails the suite.
- **The appearance setting on the closing control.** It forwards a value to the
  button library. The typechecker covers the connection and there is no behaviour
  underneath it.

The pre-commit hook — typecheck, lint, test — is the completion gate, as for
every other issue in this repository. The issue is not done until it is
committed.

## Out of Scope

- Automating the weekly turnover, the scheduled job that would run it, and the
  due-week query it would need. None of it exists in the code today.
- Any change to the between-weeks screen, which is reached when there is no
  current week at all.
- Any change to the no-plan welcome screen.
- The "Save day" button on rest days, which offers to save a day that holds
  nothing to save.
- The duplicated day-type label map kept privately by the day header instead of
  reusing the shared list.
- The dead end reached when an athlete holds a live provider session whose
  account lookup fails: the screen offers only "Try again" and gives no way to
  sign in as somebody else. It is real and it was hit while reviewing this work,
  but it belongs to authentication, not to the tracker.
- Any change to the day rows, the set controls, the feedback controls, or the
  collapsing behaviour of a day. The week list itself is not being redesigned.
- Amending or deleting the superseded documents named above.
- Week-over-week progress, streaks, or any trend beyond the current week's count.

## Further Notes

**Why the header is always on.** It would be cheaper to render it only when the
week has ended, since that is the case that prompted the work. That would also
reproduce the original fault in a tidier form: a block of interface that exists
on one day out of seven, attached to nothing the rest of the time. The header
earns its place on every week because naming the week and stating its progress is
useful on every week, and the action slot is what varies.

**Reviewed state.** The account used for this review sat in the exact edge case:
the week's last day was the day of review, and no set had been logged. The
expected result after this change is a header reading week and block position, a
date range, a count of zero out of five training days recorded, a quiet outline
trigger in the action slot, one sentence stating what next week will be built
from, and nothing floating above the week card.

**Accepted consequences**, recorded as decisions rather than oversights:

1. An athlete who trains hard but never presses "Save day" sees zero progress all
   week. The count reports what was recorded, not what was done, and the app has
   no other source of truth for that.
2. The progress ratio treats every training day as equal. A day with one set
   logged and a day fully completed both count once, because the completion flag
   is the only signal available at week level.
3. An athlete whose week has ended can still expand and edit earlier days before
   closing the week. Nothing prevents it, and nothing should — the whole point of
   softening rather than blocking is that the athlete may still want to fill the
   week in.
4. The weekday name uses a pinned locale, so an athlete in another language sees
   an English day name in that one slot. This matches the app's existing fixed
   date format and is not worth a localisation layer at this size.
