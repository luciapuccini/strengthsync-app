## Parent PRD

`issues/auth/prd.md`

## What to build

Two copy and state corrections that stop the app lying to a newly registered
athlete.

- The empty tracker currently reports that plan generation is temporarily
  unavailable and to check back once a plan has been assigned. For someone who
  registered thirty seconds ago that describes an outage that is not happening.
  It is rewritten to address a new athlete truthfully: they are set up, they do
  not have a training plan yet, and this is expected. A marker notes that
  first-plan onboarding is the next phase.
- The Apple and Google buttons render disabled with a short caption noting that
  social sign-in is not available yet, so nothing on the front door looks live
  while doing nothing.

**This slice is HITL.** The empty-state wording is the first thing a new athlete
reads after registering, and the social caption sits on the sign-up screen —
both are worth a review rather than a guess.

See the "Routing and screens" section of the parent PRD.

## Acceptance criteria

- [ ] The empty tracker's wording addresses a newly registered athlete and makes no claim about an outage or unavailability.
- [ ] The copy is reviewed and approved rather than assumed.
- [ ] A marker records that first-plan onboarding is the next phase.
- [ ] The social buttons are rendered disabled and cannot be activated by pointer or keyboard.
- [ ] A caption explains that social sign-in is not available yet.
- [ ] The mobile sizing and layout of both auth screens are unchanged — the form stays above the fold on a phone-width viewport.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/auth/007-sign-up-end-to-end.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 15
- User story 16
- User story 20
