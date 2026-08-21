# Imperial becomes canonical

**Type:** AFK

## Parent PRD

`issues/prd.md`

## What to build

The complete US-athlete path, end to end, with metric not existing yet.

An athlete onboards answering in pounds and in feet-and-inches, those answers
are stored as pounds and inches, the coach reads a profile whose every key
states its unit, generates a plan in pounds, and the tracker and history screens
render pound loads. No preference, no toggle, no conversion — one unit system
for everyone, and it is imperial.

This is unavoidably the widest slice in the PRD, because a field rename cannot
be applied to half a stack. It cuts through the database schema, the domain
contract, the onboarding answer schema and its profile mapper, the generated API
contract and its client-side mirrors, the coach prompt, the onboarding form and
the three display sites, all for one narrow concern: the canonical unit.

See "Canonical unit", "Naming", "Height precision", "Bounds", "Onboarding" and
"Migration and data" in the parent PRD.

Note two things the parent PRD is specific about. Height stores to one decimal
place, not whole inches — an imperial entry lands on an exact integer anyway,
and the decimal keeps a metric entry from being visibly distorted later. And the
prompt work in this slice is only the field rename plus the statement that
weights are in pounds; the five-pound progression rule and the ban on weights in
prose belong to `issues/002-five-pound-grid.md`. Without the pounds statement
here, though, the model would emit kilogram-magnitude numbers under pound field
names, so it cannot be deferred.

The migration adds the preference column (defaulting to imperial, unused until
`issues/003-preference-persists.md`) and drops plan, week and client-profile
rows rather than traversing JSON. Client, identity and coach records survive.

## Acceptance criteria

- [x] Every stored and transmitted measurement is in pounds or inches, and carries its unit as a field-name suffix — including the keys inside the goals, body-composition and strength-loads JSON blobs
- [x] The strength-loads blob no longer uses bare, unitless keys
- [x] Height is stored in inches to one decimal place; feet-plus-whole-inches input produces an exact integer
- [x] The protein target is untouched and remains in grams
- [x] Onboarding asks for height as two inputs, feet and whole inches, combined at submit
- [x] Onboarding labels body weight, target weight and the four strength benchmarks in pounds
- [x] Validation bounds are re-expressed in imperial with the same intent as the metric ones they replace: benchmarks up to 1000 lb, body and target weight up to 800 lb, height up to 100 in
- [x] The coach's system prompt names the new load field and states that all weights are in pounds
- [x] The three lift-load display sites render loads with a pound label
- [x] The generated API contract is regenerated and the client-side schema mirrors match it
- [x] Both seed files are rewritten with imperial values
- [x] A migration adds the unit-preference column defaulting to imperial, and drops plan, week and client-profile rows
- [x] The existing history-transform test is updated mechanically for the renames
- [x] The domain-model doc states the canonical-unit rule. `api_contracts.md` needs no
      change: it is deliberately shape-free and defers field detail to the generated spec
- [x] The pre-commit gate passes: typecheck, lint and the full test suite

## Blocked by

None - can start immediately.

## User stories addressed

- User story 1
- User story 2
- User story 3
- User story 4
- User story 10
- User story 12
- User story 21
- User story 22
- User story 24
- User story 29
- User story 30
- User story 31
- User story 32

## STATUS

DONE
