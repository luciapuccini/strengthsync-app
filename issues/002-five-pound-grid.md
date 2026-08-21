# The coach's numbers become loadable

**Type:** AFK

## Parent PRD

`issues/prd.md`

## What to build

Every load the athlete is shown is a number they can actually build from the
plates on the rack, and every number the coach writes is one the app is
displaying.

Two behaviours, serving the same goal. First, all training loads sit on a
five-pound grid: the progression rule advances five pounds, athlete-typed
benchmarks snap to the nearest five on submit, and loads the model invents snap
on the way in. Second, the coach stops writing weights into prose — numbers go
in the load field, and a note says "add load" rather than naming a figure that
could contradict the prescription rendered beside it.

The snap is expressed as a transform on the load fields of the domain schemas
themselves, not as a separate validation step. That placement is the point: the
schedule-generation parser already wraps those schemas, so one field-level
transform covers model output, inbound API writes and values read back from
storage, with no call sites to remember and no way to add a new path that
bypasses it. It is idempotent, so re-parsing a stored value is a no-op.

Off-grid values are corrected and logged, never rejected. A model slip must not
fail a week generation.

Body weight and target weight are never snapped — they are measurements and
goals, not loads to be built from plates.

See "The five-pound grid" and "Prompt changes" in the parent PRD.

**Eval coverage is deliberately not part of this issue.** The parent PRD asks for it,
but `docs/architecture/evals.md` is titled "LLM evaluation (future plan)" and there is
no runner, no Braintrust dependency and no eval cases in the repo; standing one up is
its own piece of infrastructure. The prompt changes ship eval-uncovered and that gap is
recorded for `issues/006-final-sweep.md`. The snap transform — the part that actually
guarantees loadable numbers — is unit-tested regardless.

## Acceptance criteria

- [ ] The coaching-rules document advances a lift by five pounds
- [ ] The coach's instructions forbid writing a weight into prose; numbers appear only in the load field
- [ ] A prescribed load that is not a multiple of five is corrected to the nearest five when parsed, on every path a load can enter by
- [ ] An off-grid load is logged when corrected, and never causes a parse failure or a failed week generation
- [ ] An already-gridded load is unchanged, and a null load stays null
- [ ] Body weight and target weight pass through unsnapped
- [ ] Athlete-typed strength benchmarks snap to the nearest five on submit
- [ ] Tests cover the transform per "Testing Decisions": off-grid corrected, on-grid untouched, null preserved, body and target weight left alone
- [ ] All three prompt sites are covered, not just the first-plan prompt: plan turnover
      and next-week generation build their systems inline in the workflows and were
      missed by issue 001's rename sweep because they never named the old field
- [ ] The pre-commit gate passes: typecheck, lint and the full test suite

## Blocked by

- Blocked by `issues/001-imperial-becomes-canonical.md`

## User stories addressed

- User story 16
- User story 17
- User story 18
- User story 20
- User story 23
- User story 33

## STATUS

DONE
