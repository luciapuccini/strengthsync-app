# 004 — Training step

## Parent PRD

`issues/prd.md`

## What to build

The questionnaire's third step: how the client trains today.

Training experience is asked first and gates everything after it. A complete
beginner is never shown the working-weights questions — they are asked something
they have no way to answer, and the plan is expected to prescribe exercises
without a weight and tell them how to find one instead. A client with training
history is shown the main lifts, each one individually skippable, because a
movement they never perform should not appear in their plan.

Experience level is stored alongside the lifts rather than with the goals: that
column is "what you can lift", and storing experience there means a beginner's
profile still says something meaningful rather than being empty.

This step also takes the usual rest day, and absorbs the days-per-week question
that `issues/002-questionnaire-writes-a-profile.md` parked in an earlier step —
moving it here is a relocation, not a re-implementation, and the stored profile
shape must not change as a result.

Extends the answer schema, the mapper and the form built in 002; adds no new
machinery.

## Acceptance criteria

- [ ] The answer schema gains training experience as an enum, an optional set of
      named lifts, and the rest day; the generated contract is regenerated.
- [ ] Selecting a beginner experience level hides the lifts entirely; changing
      the answer back reveals them without losing anything already typed.
- [ ] Each lift can be left blank independently, and blanks do not appear in the
      stored profile as zeroes, nulls or empty strings.
- [ ] The mapper places experience alongside the lifts, and the rest day and
      days-per-week with the schedule preferences.
- [ ] Days-per-week now lives in this step, and the profile it produces is
      identical to what 002 produced for the same answer.
- [ ] Mapper unit tests are extended to cover the new answers, including the
      beginner case producing no invented loads.
- [ ] Verified by hand: a beginner and an experienced client each complete the
      questionnaire and receive plans whose prescribed weights reflect what they
      said.
- [ ] Typecheck, lint and the full test suite pass.

## Blocked by

- Blocked by `issues/003-generate-the-first-plan.md` — the prompt behaviour this
  step feeds must already exist for the step to be verifiable.

## User stories addressed

- User stories 11, 12
- User stories 14, 15
- User story 18

## STATUS

TODO
