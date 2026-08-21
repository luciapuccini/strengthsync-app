# Metric rendering

**Type:** AFK

## Parent PRD

`issues/prd.md`

## What to build

An athlete who has set their preference to metric sees kilograms everywhere a
weight appears, and an athlete on imperial sees exactly what they saw before.

This slice introduces the units module — the single home of every conversion
and rounding rule in this PRD: pounds to kilograms, whole-kilogram display
rounding, the five-pound snap, feet-and-inches to inches, centimetres to inches
at one decimal, and weight formatting with its unit label. Pure functions, no
React, no store access, no I/O. It is built in full here even though the
onboarding-facing conversions are not consumed until
`issues/005-metric-onboarding.md`, because the module is the deep, testable
piece of this change and splitting it across two slices would leave rounding
policy in two places.

The three lift-load display sites then read the preference and render through
it. Conversion happens only at the display edge — nothing converts at the API
boundary, so the client store and the server always hold identical values.

The history delta rule is the subtle part. Deltas are computed from the
converted, rounded values, not from the canonical ones. A 135 to 140 lb
progression reads as "3kg up" for a metric athlete, matching the 61 and 64
displayed above it. Converting a canonically-computed delta would print "2kg
up" beside a visible three-unit change, which reads as a bug.

Because canonical values never change, switching units mid-week re-renders an
in-progress week without touching a single logged set.

See "Metric rendering" and "Modules" in the parent PRD.

## Acceptance criteria

- [ ] A units module exists holding every conversion and rounding rule: pound/kilogram conversion, whole-kilogram display rounding, the five-pound snap, feet-and-inches to inches, centimetres to inches at one decimal, and weight formatting with its unit label
- [ ] The units module is pure — no React, no store access, no I/O
- [ ] Metric display divides by 2.20462 and rounds to the nearest whole kilogram
- [ ] All three lift-load display sites render through the units module, reading the athlete's preference
- [ ] No conversion happens at the API boundary; the store and the server hold identical values
- [ ] History week-over-week deltas are computed from the converted, rounded values, so the delta equals the difference between the two numbers visible on screen
- [ ] Changing the preference re-renders an in-progress week with every logged set intact
- [ ] An imperial athlete's display is unchanged from `issues/001-imperial-becomes-canonical.md`
- [ ] Tests cover the units module per "Testing Decisions": pound passthrough, whole-kilogram rounding, the 100 kg round trip, the five-pound snap, feet-and-inches to inches, and centimetres to inches at one decimal
- [ ] The existing history-transform test is updated for the renames; no new delta assertions are required
- [ ] The pre-commit gate passes: typecheck, lint and the full test suite

## Blocked by

- Blocked by `issues/003-preference-persists.md`

## User stories addressed

- User story 9
- User story 11
- User story 13
- User story 14
- User story 15
- User story 25

## STATUS

TODO
