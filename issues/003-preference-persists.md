# The unit preference exists and persists

**Type:** AFK

## Parent PRD

`issues/prd.md`

## What to build

The plumbing for the metric setting, and the Account page control that writes
it. Nothing renders differently yet — that is
`issues/004-metric-rendering.md`.

The column already exists from `issues/001-imperial-becomes-canonical.md`,
defaulting to imperial. This slice makes it real: the client record carries the
preference, the session bootstrap that already fetches the signed-in client
delivers it so it is available before the first screen renders, a new partial
update on that same resource writes it and returns the updated client, and the
session store adopts that response directly rather than refetching.

The Account page gains the imperial/metric control. It is deliberately the same
control that `issues/005-metric-onboarding.md` will place at the top of
onboarding, calling the same endpoint — one writer for this column, so the two
screens cannot drift apart.

This slice is verifiable rather than demoable: flip the toggle, reload, and the
setting stuck.

See "The preference" in the parent PRD.

## Acceptance criteria

- [x] The client domain schema carries the preference as a two-member enum of imperial and metric, defaulting to imperial
- [x] The session bootstrap that fetches the signed-in client returns the preference
- [x] A partial-update endpoint on the signed-in client resource writes the preference and returns the updated client
- [x] A value outside the two-member enum is rejected by the endpoint
- [x] The session store adopts the updated client from the endpoint's response, without a refetch
- [x] The Account page has an imperial/metric control that calls that endpoint
- [x] The setting survives a reload
- [x] A route-level test covers the endpoint per "Testing Decisions": the preference persists and the updated client is returned, and an out-of-enum value is rejected
- [x] The API-contract doc describes the new endpoint
- [x] The generated API contract is regenerated and the client-side mirrors match it
- [x] The pre-commit gate passes: typecheck, lint and the full test suite

## Blocked by

- Blocked by `issues/001-imperial-becomes-canonical.md`

## User stories addressed

- User story 7
- User story 8
- User story 26
- User story 27
- User story 28

## STATUS

DONE
