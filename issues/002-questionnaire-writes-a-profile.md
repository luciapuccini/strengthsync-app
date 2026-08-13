# 002 — Questionnaire foundation writes a profile

## Parent PRD

`issues/prd.md`

## What to build

The first end-to-end path: a signed-in client answers a questionnaire in the
browser and ends up with a real coaching profile row.

This slice carries only part of the questionnaire's content — who the client is,
what they want, and how many days a week they can train — but it carries **all**
of the questionnaire's machinery, because everything added afterwards is built on
it. Each step is its own form with an action that validates that step before
advancing; validation is a UI-local schema mirroring the server's, following the
precedent already set by the browser's week-draft schema, which documents itself
as deliberately not the wire contract. Step state is a reducer local to the route.
Submission state comes from React's form-action state rather than a parallel
piece of component state, so that the pending flag is already in place for the
slice that adds the composing screen.

On the server, the answers are validated by a typed schema registered as a named
contract component — real enums and bounded numbers, not a bag of unknowns — and
a pure mapper decides which profile column each answer belongs to. That mapper is
this phase's one deep module: no I/O, no framework, and the single place that
knows the column vocabulary the model later reads.

See "The onboarding payload" and "Modules" in the parent PRD. Note in particular
why this tightening applies at the write boundary only: the demo seed holds far
richer profile data than any onboarding vocabulary would allow, and must stay
valid.

This slice is human-in-the-loop because it establishes the form pattern that four
later slices extend — the pattern gets reviewed before it spreads.

## What this slice collects

- Step 1: sex, age, height, current weight, and optionally body-fat percentage.
- Step 2: one primary goal from a short list, and optionally a target date, a
  target weight and a free-text note.
- Days per week the client can train. Its final home is the training step added
  in `issues/004-training-step.md`; it lives here because plan generation needs
  it before that step exists.

## Acceptance criteria

- [ ] A typed answer schema exists on the server, registered as a named component
      in the generated contract, with enums for the goal, bounded numbers where
      the domain has bounds, and optional fields that are genuinely optional.
- [ ] A pure mapper converts validated answers into a profile write, placing each
      answer in the column the coaching prompt will read it from.
- [ ] `POST /api/me/onboarding` validates, maps, upserts and returns the saved
      profile. The client is taken from the session; no identifier crosses the
      wire.
- [ ] The browser's payload type comes from the generated contract, so renaming a
      field on the server breaks the browser's typecheck.
- [ ] An `/onboarding` route renders the questionnaire behind the auth guard,
      with a progress indicator, a working back step, and per-step validation
      errors shown against the step that produced them.
- [ ] Optional questions can be left blank and do not produce fabricated values
      in the stored profile.
- [ ] The submit control is disabled and shows pending state for the duration of
      the request.
- [ ] Unit tests cover the mapper: each answer lands in its intended column,
      skipped optionals stay absent, and a beginner's answers produce no invented
      loads.
- [ ] An HTTP-level test covers the route returning the saved profile, in the
      style of the existing application tests.
- [ ] The generated contract is regenerated and committed.
- [ ] Verified by hand: registering a new account, visiting `/onboarding` and
      submitting produces a profile row whose contents read sensibly.
- [ ] Typecheck, lint and the full test suite pass.

## Blocked by

- Blocked by `issues/001-generic-activity-vocabulary.md` — the mapper writes to
  the renamed column.

## User stories addressed

- User stories 2, 3, 4, 5, 6, 7, 8, 9, 10
- User story 16
- User story 24
- User story 34
- User stories 37, 38, 39

## STATUS

TODO
