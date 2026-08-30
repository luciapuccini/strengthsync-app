# Mid-stream failure

## Parent PRD

`issues/prd.md`

## What to build

Replace the crude failure handling from the tracer slice with a real terminal
event, and make the failed screen honest.

Once the stream opens, the HTTP status line is spent — a failure after that point
can never be a 409 or a 502. So the server emits a terminal `failed` event
carrying the standard API error envelope, and the client converts it into the
same typed error every other call throws, landing in the existing catch without a
parallel error path.

On failure the accumulated days are **cleared**, not dimmed and not preserved.
Those rows described a candidate that was never saved, and retrying re-runs the
whole model call and produces a different plan — so leaving them on screen would
assert progress that does not exist and make the app visibly change its mind
about work it appeared to have finished.

See the parent PRD's **Failure presentation** section and the first item under
**Further Notes**.

## Acceptance criteria

- [ ] Any failure after the stream opens is emitted as a terminal `failed` event
      whose payload is the standard API error envelope, then the stream closes.
- [ ] Failures covered include the model call erroring and the completed object
      failing its schema parse.
- [ ] No post-open failure attempts to set an HTTP status code.
- [ ] The client converts a `failed` event into the standard typed client error,
      carrying its code and message, and throws it into the existing catch.
- [ ] A stream that ends without either `ready` or `failed` still produces the
      failed state, so an abrupt disconnection is not silently treated as
      success.
- [ ] The failed screen clears the header and all accumulated day rows.
- [ ] The failed screen shows an error message and a retry button.
- [ ] Retry re-runs generation only. The profile write still happens at most once
      per visit to the final step.
- [ ] A successful retry renders a fresh header and fresh rows with no trace of
      the previous attempt.
- [ ] The reducer's handling of the failed event is covered by its test.
- [ ] Typecheck, lint and the full test suite pass.

## Blocked by

- Blocked by `issues/002-day-events-and-checklist.md`

## User stories addressed

- User story 9
- User story 10
- User story 11
- User story 12
- User story 28

## STATUS

NOT STARTED
