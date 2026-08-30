# Stream the first plan generation instead of locking behind an orb

## Problem Statement

The last thing a new athlete does in onboarding is press **Finish**. The wizard
disappears, an animated orb appears, and for the next fifteen to thirty seconds
nothing else happens. There is no title, no progress, no evidence that anything
is being built — only a shape that moves. The athlete has just spent several
minutes answering questions about their body, their goal, their lifts and their
week, and the app's response to all of it is a spinner.

Three things are wrong with that:

1. **It is the worst possible moment for a dead screen.** This is the peak of
   onboarding, the point where the athlete finds out whether the questionnaire
   was worth filling in. They learn nothing until it is entirely over.
2. **A failure is indistinguishable from a slow success.** The orb pauses on
   error, but until then a twenty-second wait and a broken model call look
   identical.
3. **The work is already legible and we throw it away.** The model produces the
   plan's name, its length in weeks, and then seven days one at a time. All of
   that exists on the server well before the request finishes, and all of it is
   discarded until the final byte arrives.

## Solution

Generation streams. The same single model call runs, costing the same and taking
the same total time, but the browser now watches it happen.

Within a second or two of pressing Finish the athlete sees their block's real
name and length — *"Upper/Lower Strength · 6 weeks"* — as a heading. Beneath it,
seven rows fill in one at a time as the coach writes each day: *"Day 1 · Upper
body — 5 exercises"*, *"Day 2 · Rest"*, and so on. When the last day lands, a
short "Saving your plan…" line covers the moment the plan is written and read
back, and then the tracker opens.

Nothing about correctness changes. The stream is a **view** of an in-flight model
call: unvalidated, unpersisted, disposable. The only durable act is still the
atomic plan activation at the end, and the tracker still renders schema-validated
rows read back out of the database. If generation fails, the half-drawn plan is
cleared away entirely and the athlete is offered a retry — because those days
described a candidate that was never saved, and retrying produces a different
plan, not a resumption of that one.

The loading orb is removed, along with its dependency. Seven rows filling in say
more than an animation can.

## User Stories

1. As a new athlete, I want to see my plan's name as soon as the coach has chosen
   it, so that I know the questionnaire produced something specific to me.
2. As a new athlete, I want to see how many weeks my block runs, so that I
   understand the commitment before I reach the tracker.
3. As a new athlete, I want to watch each training day appear as it is written,
   so that the wait feels like progress rather than a hang.
4. As a new athlete, I want each day to name its focus — upper body, legs, full
   body, rest, activity, cardio — so that I learn my split before I start.
5. As a new athlete, I want each lifting day to show how many exercises it holds,
   so that I can gauge how heavy my week looks.
6. As a new athlete, I want rest days to be labelled plainly as rest, so that I
   can see the plan respects recovery.
7. As a new athlete, I want the screen to tell me when it is saving rather than
   generating, so that a pause after the last day does not read as a freeze.
8. As a new athlete, I want to land on the tracker automatically once the plan is
   saved, so that I do not have to press anything else to start training.
9. As a new athlete, I want a clear error message when generation fails, so that
   I know the app is broken rather than slow.
10. As a new athlete, I want a retry button when generation fails, so that I can
    recover without re-answering the questionnaire.
11. As a new athlete, I want the half-finished plan cleared away when generation
    fails, so that I am not shown days that were never saved.
12. As a new athlete retrying after a failure, I do not want to re-enter my
    answers, so that a transient model failure costs me seconds, not minutes.
13. As a new athlete who closed the tab mid-generation, I want my plan to be
    there when I come back, so that I do not lose a plan that was already paid
    for and nearly finished.
14. As a new athlete who returns after a completed generation, I want to be taken
    straight to my tracker, so that I never see the questionnaire twice.
15. As a new athlete who already has an active plan, I want the app to refuse to
    generate a second one, so that my training is not silently replaced.
16. As a new athlete who has not completed the questionnaire, I want generation
    refused before any model call, so that a broken state does not spend budget.
17. As a new athlete on a phone, I want the progress screen to cost little data,
    so that streaming does not punish me for being on cellular.
18. As a new athlete, I want the plan I see on the tracker to be exactly the plan
    that was saved, so that nothing I watched being written can quietly differ.
19. As a signed-out or expired-session athlete, I want the same sign-in prompt I
    get everywhere else, so that streaming is not a special case I have to learn.
20. As a developer, I want the stream's event shapes defined by schemas at the
    HTTP boundary, so that the payloads are documented rather than described in
    prose.
21. As a developer, I want those event types generated into the client's types,
    so that a renamed field breaks the build instead of breaking at runtime.
22. As a developer, I want the day-settled logic in a pure module, so that the
    one piece of genuinely fallible reasoning can be tested without a model, a
    network, or a server.
23. As a developer, I want the accumulation of events into screen state to be a
    reducer, so that it matches how the rest of this app handles derived state
    and can be tested by folding a fixed sequence.
24. As a developer, I want the model-call setup to stay in the agent runtime, so
    that the API-key guard and telemetry registration exist in exactly one place.
25. As a developer, I want the route handler to stay thin plumbing, so that there
    is no logic hidden inside framework callbacks.
26. As a developer, I want the generated API document to record that this
    response streams, so that the contract does not lie about the route.
27. As a developer, I want the old non-streaming route removed rather than kept
    beside the new one, so that we do not add a third consumerless endpoint to
    the two already flagged.
28. As a developer, I want mid-stream failures to arrive as an event carrying the
    standard error envelope, so that they land in the existing client error
    handling instead of a parallel path.
29. As a developer, I want the SSE reader to be a standalone module, so that a
    future streaming endpoint does not re-implement frame parsing.
30. As a maintainer, I want the loading-orb dependency dropped once nothing
    renders it, so that the dependency list reflects what the app actually uses.
31. As a maintainer, I want the two documentation statements this invalidates
    corrected in the same change, so that the architecture notes do not describe
    a system that no longer exists.

## Implementation Decisions

### Scope of the change

- **Streaming only. No tools.** No custom tools and no provider-hosted tools
  (web search, code interpreter, file search) are added. They were evaluated and
  rejected: the arithmetic case for a code interpreter is real but does not
  justify the added latency and per-session cost right now, and web search would
  pipe unvetted coaching advice into a plan for an athlete with a declared
  injury. The call remains a single structured-output generation against the
  same model.
- The transport is **Fetch plus Server-Sent Events**, not `EventSource`. The API
  requires a bearer header, which `EventSource` cannot send.

### API contract

- The existing first-plan generation route **changes in place**. Its `200`
  becomes `text/event-stream`; no parallel JSON route is introduced. Adding one
  would create a third consumerless endpoint, which the API-contracts document
  already names as debt.
- Guard failures — unauthenticated, no profile, plan already active — still
  answer as ordinary JSON with their existing status codes, because they run
  before any byte of the stream is written. The route therefore answers two
  content types depending on outcome. This is deliberate.
- Once the stream opens the status line is spent. **Any failure after that point
  arrives as a terminal `failed` event**, never as a status code. Its payload
  reuses the existing API error envelope so the client can convert it into the
  same typed error every other call throws.

### Event vocabulary

The server emits **semantic, server-diffed events**, not raw partial snapshots:

| Event | Payload | When |
| --- | --- | --- |
| `meta` | plan label, total weeks | Once, as soon as both are parsed |
| `day` | day index, day type, exercise count | Once per day, as each settles |
| `ready` | plan id, first week id | After the plan is activated |
| `failed` | standard error envelope | Any post-open failure |

- Snapshots were rejected because a snapshot's schema is a deeply-partial plan —
  every field optional at every level — which is worthless as a documented
  component and forces optional-chaining through the rendering code. Semantic
  events also avoid re-sending the whole growing plan dozens of times over
  cellular.
- A day is considered **settled** when the next day appears in the partial
  object, or at stream end for the final day.
- `ready` carries identifiers only. It does not carry the plan or the week,
  because the client already discards the current response body and refetches
  from the database; embedding them would create a second rendering path fed by
  stream data rather than persisted data.

### Contract propagation

- The event union is declared as a schema at the HTTP boundary and **registered
  as a named component**, following the same domain-to-HTTP bridging pattern the
  plans area already uses. It flows through the OpenAPI generation step into the
  client's generated types.
- This matters because the lint configuration forbids client code from importing
  any server workspace package. The generated document is the only sanctioned
  channel for a server-owned type to reach the browser, so hand-writing the types
  client-side or introducing a shared contracts package were both rejected.
- **Accepted tradeoff:** the declared schema documents but does not validate.
  Nothing in the framework checks what is actually written to the stream.

### Server modules

- **A day-settling module (new, pure).** Given what has already been emitted and
  the latest partial object, it returns the events to write plus updated
  emit-state. No I/O, no framework types. This is the only genuinely fallible
  logic in the change and it is isolated on purpose.
- **A streaming counterpart in the agent runtime (new).** Mirrors the existing
  non-streaming entry point and returns a stream result. Keeps the API-key guard
  and the telemetry-logger registration in one module rather than duplicating
  provider setup inside a route.
- **The route handler (modified, thin).** Runs the existing guards unchanged,
  opens the stream, loops the partial output through the day-settling module,
  writes events, activates the plan, emits `ready`. Plumbing only.
- **Durability on disconnect.** Generation and activation run as a single promise
  registered with the Worker execution context so it survives the client
  disconnecting, and every stream write is guarded against an aborted stream.
  Closing the tab mid-generation still produces a saved plan. No new recovery UI
  is needed: the onboarding route already redirects to the tracker when an active
  plan exists. Activation keeps its existing deterministic idempotency key.
  Money is spent the instant the model call starts, so abandoning the work would
  save nothing and charge again on retry.

### Client modules

- **An SSE reader (new).** Takes a response, yields parsed events, generic over
  the payload type and ignorant of plans. It must handle a frame split across
  chunk boundaries.
- **A composing reducer (new, pure).** Folds events into screen state — header,
  accumulated days, phase. Matches the existing reducer convention in this
  codebase.
- **The generate call (modified).** Stops going through the typed OpenAPI client,
  which parses the body and would consume the stream, and uses the existing
  authorized-fetch helper directly. The bearer token path is unchanged. Maps a
  `failed` event into the standard typed client error.
- **The composing screen (rewritten, presentational).** Renders reducer state:
  header on `meta`, rows on `day`, a saving line after the last day, an error
  with retry on failure. The orb is removed, its preview component is deleted,
  and the dependency is dropped from the client package and the workspace
  catalog.
- **Second piece of state, deliberately.** The submit action currently comments
  that its pending boolean is the single in-flight signal. That stops being
  sufficient: a boolean cannot carry accumulated events, so stream state lives in
  its own state hook beside it, and that comment is corrected.
- The retry path is unchanged in substance: the profile write still happens at
  most once per visit to the final step, so a retry re-runs generation only.

### Failure presentation

On failure the accumulated days are **cleared**, not dimmed and not preserved.
Keeping them would assert that progress was saved and that retry resumes from
there; both are false. A retry re-runs the whole call and will produce a
different plan, so leaving the dead candidate on screen means the app visibly
changes its mind about work it appeared to have finished.

### Not measured

No new analytics. The existing generation started/succeeded/failed events are
unchanged. Note for the record: total latency is the metric that will *not* move,
so the existing events cannot distinguish a working stream from one that has been
silently buffered into a single blob by a proxy. Adding a time-to-first-event
property was proposed and declined.

### Documentation

Only the two statements this change makes false are corrected: the architecture
note describing first-plan generation as a synchronous model call, and the
client API module's comment asserting every call goes through the typed client.
No new streaming-conventions section is added.

## Testing Decisions

A good test here asserts **external behaviour through a module's public
interface** — inputs in, outputs out — and never reaches for internal state or
call order. It should survive a rewrite of the module's internals. Where a test
would exist only to pin a payload's shape, the schema at the boundary does that
job instead and no test is written.

**Tested:**

- **The day-settling module.** Fed hand-built partial objects representing a
  realistic parse sequence, asserting the returned events. Cases that matter: a
  day is emitted exactly once; a day is not emitted while it is still the last
  one in the partial array; the final day is emitted at stream end; `meta` is
  emitted once and only when both its fields are present; a partial object that
  never completes emits no `ready`. This is the one piece of genuinely fallible
  reasoning in the change. Prior art: the colocated pure schema test in the weeks
  route area.
- **The composing reducer.** Folds a fixed event sequence into state and asserts
  the result — header populated on `meta`, rows accumulated in order, days
  cleared on `failed`, saving phase entered after the last day. Prior art: the
  existing week and onboarding reducer tests.

**Deliberately not tested:**

- The SSE reader. Considered and declined.
- The generate call's error mapping. Glue over already-tested pieces.
- The route handler end to end. Testing it would require injecting the model
  runtime as a new application-wide collaborator, and a fake stream models the
  parts that would be covered — stream plumbing, execution-context durability,
  abort guards — least faithfully.

**Knowingly uncovered, accept it consciously:** the disconnect-still-commits
path, and the mid-stream `failed` event. Both are real behaviours that only a
running system verifies honestly.

The completion gate is the pre-commit hook — typecheck, lint, test. The OpenAPI
generation step must be re-run and its artifacts committed, or CI's no-op diff
check fails the build.

## Out of Scope

- **Tools of any kind.** Custom tools, and the provider-hosted web search, code
  interpreter and file search. Evaluated and rejected for now; the transport
  built here can carry tool-call events later without being redesigned.
- **Streaming the weekly progression workflow.** That path runs as a durable
  Cloudflare Workflow, returns an instance id immediately, and has no UI polling
  today. It is untouched.
- **A live exercise-level plan preview.** Rejected: it would duplicate the
  tracker's day and exercise rendering in a second place that must be maintained
  against it forever, to preview a screen the athlete reaches a second later.
- **Analytics for perceived latency.**
- **Retrying generation automatically.** Retry stays a button the athlete presses.
- **Resuming a failed generation.** There is nothing to resume; the call is atomic.
- **Preventing a fast retry from racing an in-flight background activation.** The
  write is protected by its idempotency key; what is unprotected is paying for two
  model calls. Not worth solving at this stage.
- **A general streaming convention for the API.** One route streams. If a second
  one wants to, that is when the convention gets written down.

## Further Notes

- **The stream can lie, briefly.** Events are derived from unvalidated partial
  model output; the full-object schema parse only runs at the end. An athlete can
  therefore watch seven days appear for a plan that is then rejected and never
  saved. This is why the failure state wipes the screen rather than preserving
  it, and why nothing downstream may ever treat stream data as authoritative.
- **Silent buffering is the sneakiest failure mode.** If a proxy or a missing
  header buffers the response, the feature degrades to exactly today's behaviour
  — a long wait then everything at once — with no error anywhere. With no
  time-to-first-event metric, this will only be caught by someone looking at it.
  Worth checking by hand once after deploy.
- **Key order is load-bearing.** The design depends on the model emitting the
  plan's label and week count before the days, which follows the schema's field
  order. If that schema is ever reordered, the header stops arriving early and
  the feature quietly loses most of its value.
- **This is the first use of Worker execution-context durability in the server.**
  Work now outlives its request. The existing telemetry logger still writes one
  line per model call, but that line can now be written after the response is
  gone.
- **A dependency is being deleted that someone justified on purpose.** The orb
  carries a written rationale covering catalog policy, bundle weight and its
  rendering approach. Removing it is a considered reversal, not an oversight.
