# Streaming transport tracer — plan header end to end

## Parent PRD

`issues/prd.md`

## What to build

The tracer bullet: convert first-plan generation from a synchronous JSON
response into a Server-Sent Events stream, and get exactly one event — the plan
header — all the way from the model to the athlete's screen.

After pressing **Finish**, the athlete sees their block's real name and length
appear within a second or two ("Upper/Lower Strength · 6 weeks"), above the
existing loading orb, and then lands on the tracker as they do today. No day
rows yet; that is the next slice.

This slice establishes the whole pipe: the event union as a documented contract,
the streaming model call, the thin handler, the client-side reader, and the
screen consuming events instead of awaiting a body. Everything after this is a
narrow addition to a working stream.

See the parent PRD's **API contract**, **Contract propagation**, **Server
modules** and **Client modules** sections. Only the `meta` and `ready` events are
in scope here.

Failure handling is deliberately crude in this slice: a stream that ends without
`ready` is treated as a failure and falls into the existing catch, producing
today's failed state. The `failed` event that carries a real code and message is
a later slice.

Both documentation statements the PRD identifies become false in this slice — the
architecture note calling first-plan generation a synchronous model call, and the
client API module's comment asserting every call goes through the typed client —
so both are corrected here rather than deferred.

## Acceptance criteria

- [x] The existing first-plan generation route answers `text/event-stream` on
      success. No parallel JSON route exists; the old response shape is gone.
- [x] The unauthenticated, no-profile and plan-already-active guards still answer
      as ordinary JSON with their current status codes, before any stream byte is
      written.
- [x] The stream event union is declared as a schema at the HTTP boundary and
      registered as a named component, following the plans area's existing
      domain-to-HTTP bridging pattern.
- [x] The generated API document and the client's generated types both carry that
      component. The generation step is re-run and its artifacts committed, so
      CI's no-op diff check passes.
- [x] The model call is made through a streaming counterpart in the agent
      runtime, not by the route. The API-key guard and telemetry-logger
      registration are not duplicated.
- [x] The route handler is plumbing only: guards, open stream, emit `meta`,
      activate the plan, emit `ready`, close.
- [x] `meta` is emitted once, as soon as both the plan label and total weeks are
      parsed from the partial output.
- [x] `ready` carries the plan id and first week id only — not the plan, not the
      week.
- [x] Plan activation is unchanged: same atomic command, same deterministic
      idempotency key, same database as the source of truth.
- [x] The client's generate call no longer goes through the typed OpenAPI client.
      It uses the existing authorized-fetch helper, so the bearer token path is
      unchanged.
- [x] A standalone SSE reader module turns a response into parsed events, generic
      over the payload type, and correctly handles a frame split across chunk
      boundaries.
- [x] The composing screen renders the plan label and week count when `meta`
      arrives. The orb remains for now.
- [x] On `ready`, the client invalidates its caches and navigates to the tracker
      exactly as it does today; the tracker renders data read back from the
      database.
- [x] A stream that ends without `ready` produces today's failed state with its
      retry button.
- [x] The architecture note no longer describes this route as a synchronous model
      call.
- [x] The client API module's comment about every call going through the typed
      client is corrected.
- [x] Typecheck, lint and the existing test suite pass. The two existing guard
      tests for this route still pass unmodified.

## Blocked by

None - can start immediately.

## User stories addressed

- User story 1
- User story 2
- User story 8
- User story 15
- User story 16
- User story 17
- User story 18
- User story 19
- User story 20
- User story 21
- User story 24
- User story 25
- User story 26
- User story 27
- User story 29
- User story 31

## STATUS

DONE
