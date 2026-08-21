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

- [~] A units module exists holding every conversion and rounding rule: pound/kilogram conversion, whole-kilogram display rounding, the five-pound snap, feet-and-inches to inches, centimetres to inches at one decimal, and weight formatting with its unit label — all but the five-pound snap; see the note below
- [x] The units module is pure — no React, no store access, no I/O
- [x] Metric display divides by 2.20462 and rounds to the nearest whole kilogram
- [x] All three lift-load display sites render through the units module, reading the athlete's preference
- [x] No conversion happens at the API boundary; the store and the server hold identical values
- [x] History week-over-week deltas are computed from the converted, rounded values, so the delta equals the difference between the two numbers visible on screen
- [x] Changing the preference re-renders an in-progress week with every logged set intact
- [x] An imperial athlete's display is unchanged from `issues/001-imperial-becomes-canonical.md`
- [~] Tests cover the units module per "Testing Decisions": pound passthrough, whole-kilogram rounding, the 100 kg round trip, the five-pound snap, feet-and-inches to inches, and centimetres to inches at one decimal — all but the five-pound snap; see the note below
- [x] The existing history-transform test is updated for the renames; no new delta assertions are required
- [x] The pre-commit gate passes: typecheck, lint and the full test suite

## Note on the five-pound snap

The snap is not in `client/src/utils/units.ts`. `issues/002` already made it a
Zod transform on the load fields of the domain schemas
(`server/src/domain/weight-grid.ts`), so it applies to model output, to inbound
API writes and to values read back from storage with no call site to remember —
including whatever onboarding submits. The client cannot import it (the
import-boundary lint forbids reaching into `server/`), so putting a copy in the
client module would split one rule across two homes, which is the thing this
issue is trying to avoid. `issues/005` should add a client-side snap here only
if it needs to show the snapped figure back to the athlete before the server
answers.

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

DONE
