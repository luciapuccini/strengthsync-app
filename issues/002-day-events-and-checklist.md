# Day events and the checklist

## Parent PRD

`issues/prd.md`

## What to build

Seven rows that fill in one at a time as the coach writes each training day.

Beneath the header from the previous slice, the athlete watches their week
assemble: "Day 1 · Upper body — 5 exercises", "Day 2 · Rest", and so on, each row
appearing as that day settles in the model's output. This is the slice that
delivers the actual product value — the wait becomes legible.

Both of the PRD's tested modules land here:

- the **day-settling module** on the server, which owns the entire emit-once
  heuristic behind a pure interface, and
- the **composing reducer** on the client, which folds events into screen state.

See the parent PRD's **Event vocabulary** section for the `day` payload and the
settling rule, and **Testing Decisions** for what each module's test must cover.

The orb is still present after this slice; retiring it is the next one.

## Acceptance criteria

- [ ] A pure day-settling module takes what has already been emitted plus the
      latest partial object and returns the events to write plus updated
      emit-state. It performs no I/O and imports no framework types.
- [ ] A day is emitted once the next day appears in the partial object, or at
      stream end for the final day.
- [ ] Each day is emitted exactly once. No day is emitted twice, and no day is
      skipped, across a realistic parse sequence.
- [ ] `day` events carry the day index, the day type, and the exercise count —
      nothing else. No exercise-level detail is streamed.
- [ ] The route handler loops the partial output through that module and writes
      whatever it returns. The settling logic does not live in the handler.
- [ ] The day-settling module has a colocated unit test fed hand-built partial
      objects, covering at minimum: a day emitted exactly once; a day withheld
      while it is still the last one present; the final day emitted at stream
      end; `meta` emitted once and only when both fields are present; a partial
      object that never completes emitting no `ready`.
- [ ] A pure reducer folds the event sequence into screen state — header,
      accumulated days in order, phase — following the codebase's existing
      reducer convention.
- [ ] The reducer has a test that folds a fixed event sequence and asserts the
      resulting state, in the shape of the existing reducer tests.
- [ ] Stream state lives in its own state hook alongside the submit action's
      pending boolean, and the code comment claiming that boolean is the single
      in-flight signal is corrected.
- [ ] The composing screen renders one row per day as each arrives, showing the
      day's focus and, for lifting days, its exercise count. Rest days read
      plainly as rest.
- [ ] Rows appear in day order regardless of arrival timing.
- [ ] Typecheck, lint and the full test suite pass.

## Blocked by

- Blocked by `issues/001-streaming-transport-tracer.md`

## User stories addressed

- User story 3
- User story 4
- User story 5
- User story 6
- User story 22
- User story 23

## STATUS

NOT STARTED
