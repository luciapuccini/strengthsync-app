# 005 — Life step

## Parent PRD

`issues/prd.md`

## What to build

The questionnaire's fourth and final step: everything around the training that
changes what the training should be.

The client declares other sports — swimming, cycling, a pilates class — with a
rough frequency, and those sessions become days in the generated plan rather than
load stacked on top of it. They say how active their day is outside training,
which the coaching rules treat as compounding fatigue. They say whether they are
eating in a deficit, at maintenance or in a surplus, because the rules forbid
pushing an underfed client. And they describe any injury in their own words,
which is the single answer most able to make a generated plan actively harmful if
ignored.

Each of these lands in a profile column the weekly workflow already reads, so
they keep influencing coaching long after week one. The declared activities use
the generic column and convention introduced in
`issues/001-generic-activity-vocabulary.md`.

Extends the answer schema, the mapper and the form; adds no new machinery.

## Acceptance criteria

- [ ] The answer schema gains a typed list of activities, a daily-activity-level
      enum, an eating-phase enum with an optional protein target, and free text
      for injuries and anything else; the generated contract is regenerated.
- [ ] Activities can be added and removed, and an empty list is a valid answer.
- [ ] The mapper places activities in the activities column following the
      documented convention, daily activity level with the schedule preferences,
      eating phase with nutrition, and the free text in the profile's notes.
- [ ] Every question in this step can be skipped, and skipping produces no
      fabricated content in the stored profile.
- [ ] Mapper unit tests are extended to cover the new answers.
- [ ] Verified by hand: a client declaring two weekly swims receives a plan whose
      swim sessions appear as activity days on non-lifting days, and a client
      declaring an injury receives a plan that avoids the movement named.
- [ ] Typecheck, lint and the full test suite pass.

## Blocked by

- Blocked by `issues/004-training-step.md` — same schema, mapper and form.

## User stories addressed

- User stories 19, 20
- User story 21
- User story 22
- User story 23

## STATUS

TODO
