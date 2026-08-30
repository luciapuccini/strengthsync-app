# Commit on disconnect

## Parent PRD

`issues/prd.md`

## What to build

Make a closed tab stop costing the athlete their plan.

The money is spent the instant the model call starts. Abandoning the work when
the browser goes away saves nothing and charges again on retry — so generation
and activation run as a single promise registered with the Worker execution
context, surviving the client disconnecting, and every stream write is guarded
against an aborted stream.

An athlete who closes the tab at second ten and comes back finds a saved plan.
No new recovery UI is needed: the onboarding route already redirects to the
tracker when an active plan exists.

This is the first use of work outliving its request in this server. See the
parent PRD's **Server modules** section, and the note under **Further Notes**
about the telemetry line now being written after the response is gone.

## Acceptance criteria

- [x] Generation and plan activation run as one promise registered with the
      Worker execution context, so the runtime does not tear the work down when
      the client disconnects.
- [x] Every stream write is guarded against an aborted stream. A disconnected
      client produces no write errors and no noisy failure logging.
- [x] A disconnect partway through generation still results in a saved, activated
      plan.
- [x] Returning to onboarding after such a disconnect redirects to the tracker,
      via the existing redirect, with no new UI added.
- [x] Plan activation keeps its existing deterministic idempotency key, so a
      retry that races a still-running background activation cannot produce two
      plans.
- [x] The telemetry logger still writes one line per model call when that call
      completes after the response has ended.
- [x] Typecheck, lint and the full test suite pass.

Note: the disconnect path is listed in the PRD as knowingly uncovered by tests.
The criteria above describing disconnect behaviour are satisfied by
implementation and review rather than by an automated assertion; this is a
deliberate, recorded gap, not an oversight.

## Blocked by

- Blocked by `issues/001-streaming-transport-tracer.md`

## User stories addressed

- User story 13
- User story 14

## STATUS

DONE
