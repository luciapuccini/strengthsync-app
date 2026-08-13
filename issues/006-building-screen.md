# 006 — Building screen with the thinking orb

## Parent PRD

`issues/prd.md`

## What to build

Generation takes long enough that a still page reads as a broken one. On submit,
the questionnaire is replaced by a dedicated screen with an animated thinking orb
and copy saying the plan is being composed, held for the whole request and
handing over to the tracker when it lands.

The orb comes from an external configurator (orbs.jakubantalik.com); the exported
snippet becomes a component in the browser's component tree. Judge its cost
before adopting it: if the export brings a WebGL or canvas dependency, weigh that
against a screen each client sees once per account, and say so in the issue's
outcome either way.

Failure gets the minimum and no more, per the parent PRD's scope: the orb stops,
a short message appears, and a button retries. Retrying re-runs generation only —
the profile is already saved — and the answers are still in the reducer, so
nothing is retyped. There is no diagnosis, no partial recovery and no support
path in this slice.

The pending flag driving all of this already exists from the form-action state
established in `issues/002-questionnaire-writes-a-profile.md`; this slice should
consume it rather than introduce a second notion of "in flight".

This slice is human-in-the-loop: you export the orb, and whether it looks right
is a visual call.

## Acceptance criteria

- [ ] Submitting replaces the questionnaire with the composing screen for the
      duration of the request; the form is not left on screen looking editable.
- [ ] The orb component lives with the other browser components and its origin is
      recorded in a comment, along with any dependency it brought.
- [ ] Bundle impact is checked and noted; if a dependency is added it is declared
      through the workspace's single-version catalog like every other shared
      dependency.
- [ ] On success the tracker resource is invalidated and the client is navigated
      to the tracker with week one visible.
- [ ] On failure the screen shows a short message and a retry control; retrying
      calls generation only, and the answers are preserved.
- [ ] The screen is reachable in a state you can look at without waiting for a
      real generation, so the animation can be reviewed.
- [ ] Typecheck, lint and the full test suite pass.

## Blocked by

- Blocked by `issues/003-generate-the-first-plan.md` — there is no wait to fill
  until generation exists.

## User stories addressed

- User story 25
- User stories 27, 28

## STATUS

TODO
