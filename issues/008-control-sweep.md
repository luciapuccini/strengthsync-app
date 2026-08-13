# 008 — Control sweep and week-two regression

## Parent PRD

`issues/prd.md`

## What to build

A final pass over the whole phase, before it is called done.

Two parts. The first is the regression the parent PRD promises but nothing
automated checks: a generated first plan must behave like any other plan. Take a
freshly onboarded account, log week one, complete it, and confirm the weekly
workflow produces an adjusted week two from the profile the questionnaire wrote.
Then confirm that nothing about a generated first plan makes turnover a special
case at block end. This is the only place the phase's central assumption — that a
first plan and a turnover plan are the same kind of object — is actually
exercised.

The second is a review of the phase against its own intentions:

- **On track?** Does what shipped match the parent PRD's decisions, and where it
  does not, was that a considered change or a drift?
- **Conventions.** Any file, function or naming that diverged from the repo's
  standards — the per-area route shape, the domain layer's purity, the mapper's
  role as the one place that knows the column vocabulary, the single-version
  dependency catalog.
- **Side findings.** Bugs and out-of-scope discoveries found along the way:
  documented, and deliberately *not* actioned. The parent PRD's "Out of Scope"
  list is the reference for what was consciously left out; anything new belongs
  beside it or in the post-MVP notes.
- **Documentation.** Whether `/docs` kept up: the domain model's vocabulary, the
  API contract's operation list and its statement about who may activate a plan,
  the stack document's open todo about onboarding that generates the initial
  plan, and the README's account of what a new client experiences.
- **Next steps.** A short, honest list — the equipment question that was dropped,
  the designed failure experience, rate limiting on generation, a profile-editing
  screen, and the still-consumerless profile write route.

This slice is human-in-the-loop by nature: it is a judgement pass, not a change.

## Acceptance criteria

- [ ] A newly onboarded account completes week one and receives an adjusted week
      two; what changed between the two weeks is consistent with what the client
      logged.
- [ ] Plan turnover from a generated first plan is confirmed to behave normally,
      or the gap is written up.
- [ ] The generated contract regenerates to a no-op, and CI's regeneration diff
      passes.
- [ ] Divergences from repo conventions are listed, each either fixed or recorded
      with a reason.
- [ ] Side findings are documented and explicitly not actioned.
- [ ] `/docs` is consistent with what shipped; every document the phase
      invalidated has been updated.
- [ ] A next-steps list is written where the team will find it, not only in this
      issue.
- [ ] Typecheck, lint and the full test suite pass.

## Blocked by

- Blocked by `issues/004-training-step.md`
- Blocked by `issues/005-life-step.md`
- Blocked by `issues/006-building-screen.md`
- Blocked by `issues/007-entry-points-and-guards.md`

## User stories addressed

- User stories 35, 36
- User story 48

## STATUS

TODO
