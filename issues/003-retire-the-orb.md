# Retire the orb

## Parent PRD

`issues/prd.md`

## What to build

Remove the loading orb now that seven filling rows say more than an animation
can, and label the last phase of the wait honestly.

After the final day lands there is still a real pause — the plan is written to
the database and then read back across several endpoints — during which the
checklist sits complete and nothing moves. A short "Saving your plan…" line
covers it, so a pause after the last row does not read as a freeze.

The orb's dependency is dropped from the client package and the workspace
catalog, and its preview component is deleted.

See the parent PRD's **Client modules** and **Further Notes** sections. Note that
this reverses a documented, deliberate dependency choice — the orb carries a
written rationale covering catalog policy, bundle weight and its rendering
approach. Removing it is a considered reversal, not an oversight, and the
justification comment goes with it.

## Acceptance criteria

- [x] The composing screen no longer renders the orb, in any phase, including the
      failed state.
- [x] The orb's preview component is deleted.
- [x] The orb dependency is removed from the client package manifest and from the
      workspace catalog. Nothing in the workspace still references it.
- [x] The lockfile is updated and committed.
- [x] A "Saving your plan…" line is shown between the final day row and
      navigation, covering the database write and the tracker's refetch.
- [x] The saving phase is distinct from the generating phase in the reducer's
      state, not inferred in the view.
- [x] The athlete never sees a blank screen between the last row and the tracker.
- [x] Typecheck, lint and the full test suite pass, including the catalog's
      single-version policy check.

## Blocked by

- Blocked by `issues/002-day-events-and-checklist.md`

The checklist must exist before the orb can go, or there is no progress UI at
all.

## User stories addressed

- User story 7
- User story 30

## STATUS

DONE
