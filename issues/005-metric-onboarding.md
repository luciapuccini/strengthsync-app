# Onboarding in metric

**Type:** AFK

## Parent PRD

`issues/prd.md`

## What to build

A metric athlete answers the entire questionnaire in kilograms and centimetres
without converting anything, and never has to state the preference twice.

An imperial/metric segmented control sits at the top of the first step,
defaulting to imperial. Choosing metric writes the preference immediately via
the same endpoint the Account page uses, and governs the labels, bounds and
submit-time conversion of every subsequent step — the questionnaire stays
coherent from the first question to the last without asking again.

Under metric, height becomes a single centimetres field in place of the
feet-and-inches pair from
`issues/001-imperial-becomes-canonical.md`. Body weight, target weight and the
four strength benchmarks change label and bound, and convert to canonical
imperial at submit.

The round trip is the thing to get right: a metric athlete typing 100 kg for a
lift stores 220 lb after the five-pound snap from
`issues/002-five-pound-grid.md`, and reads back as 100 kg. The snap is invisible
to them. Body weight and target weight convert but do not snap.

If the preference write fails, the form continues in the chosen unit locally and
the answers still submit as canonical imperial — the stored data is correct
either way, and only the display preference would be wrong, correctable from
the Account page.

See "Onboarding" and "The preference" in the parent PRD.

## Acceptance criteria

- [ ] An imperial/metric control sits at the top of the first onboarding step, defaulting to imperial
- [ ] Choosing a unit writes the preference through the same endpoint the Account page uses — no second writer for the column
- [ ] The choice governs every later step's labels, bounds and conversion without asking again
- [ ] Under metric, height is a single centimetres field; under imperial it remains feet plus whole inches
- [ ] Body weight, target weight and the four strength benchmarks are labelled and bounded in the chosen unit, and convert to canonical imperial at submit
- [ ] A metric athlete's typed lift load round-trips: entering 100 kg displays back as 100 kg
- [ ] Body weight and target weight convert but are not snapped to the five-pound grid
- [ ] A failed preference write does not block the questionnaire, and the submitted answers are still stored as canonical imperial
- [ ] All conversion goes through the units module from `issues/004-metric-rendering.md`; no conversion arithmetic is written inline in the form
- [ ] The pre-commit gate passes: typecheck, lint and the full test suite

## Blocked by

- Blocked by `issues/003-preference-persists.md`
- Blocked by `issues/004-metric-rendering.md`

## User stories addressed

- User story 5
- User story 6
- User story 19

## STATUS

TODO
