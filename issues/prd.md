# PRD — First-plan onboarding

## Problem Statement

A new client can register, sign in, and then hits a wall. The tracker tells them
"You're all set up… there's no training plan on your account yet, so there's
nothing to track" — which is honest and useless. Everything the product does
well happens *after* a plan exists: browsing the week, logging sets, tagging an
exercise hard or heavy, completing the week so the workflow adapts the next one.
None of it is reachable, because the only way a plan comes into existence today
is the plan-turnover branch of the weekly workflow, which requires a completed
block that requires a plan.

The one client with a plan is the seeded demo account, whose profile was written
by hand as SQL. There is no screen anywhere in the product that writes a client
profile, and the profile routes that exist have no consumer. So a real new user
has no path from "account created" to "training on Monday".

## Solution

After registering, the client answers a short four-step questionnaire — who they
are, what they want, how they train, and what else their week contains. On submit,
those answers become their coaching profile, and the product generates their first
training block and week one from it, showing an animated "building your plan"
screen while it works. When it lands, they are on the tracker looking at Monday.

The questionnaire is deliberately short. It asks only what the coaching rules
actually consume — goals, schedule, training experience and current loads,
nutrition adequacy, daily activity, other sports, and injuries — and it lets a
beginner skip the questions they cannot answer, such as their working weights.

Generation is a single request the client waits through, not a background job.
It reuses the coaching rules and the plan-activation machinery that the weekly
workflow already uses, so a first plan and a turnover plan are the same kind of
object and week one is created the same way.

## User Stories

1. As a newly registered client, I want to be taken straight into onboarding, so that I am not dropped on an empty tracker with nothing to do.
2. As a newly registered client, I want the questionnaire to be four short steps with visible progress, so that I know how much is left before I start.
3. As a client filling in onboarding, I want to move back to a previous step, so that I can correct an answer without starting over.
4. As a client, I want to give my sex, age and height, so that the plan accounts for who I am.
5. As a client, I want to give my current weight, so that load prescriptions and volume are proportionate to me.
6. As a client who knows it, I want to give my body-fat percentage, so that a body-composition goal has a starting point — and skip it when I don't.
7. As a client, I want to choose one primary goal from a short list, so that my plan has a single clear direction instead of a compromise between three.
8. As a client with a deadline, I want to give a target date, so that the block length and progression suit the time I have.
9. As a client with a weight target, I want to give it, so that the plan is oriented toward it.
10. As a client whose goal doesn't fit the list, I want to add a free note, so that "I want my lower back to stop hurting on long flights" is not lost.
11. As a client, I want to say how long I have been training, so that I am not handed a plan written for somebody with five years of practice.
12. As a complete beginner, I want to skip the working-weights questions entirely, so that onboarding does not ask me things I have no way to answer.
13. As a beginner, I want my first plan to prescribe exercises without a weight and tell me how to find one, so that I can start training without inventing numbers.
14. As an experienced client, I want to give my working weights on the main lifts, so that my first week is not insultingly easy.
15. As an experienced client, I want to skip any individual lift I don't train, so that a movement I never do doesn't appear in my plan.
16. As a client, I want to say how many days a week I can train, so that my plan fits the life I actually have.
17. As a client, I want the plan to contain exactly that many training days, so that I am not silently handed six sessions after saying three.
18. As a client, I want to name my usual rest day, so that my week matches my commitments.
19. As a client who swims, cycles or takes a pilates class, I want to declare those sessions, so that they are planned around rather than stacked on top of a heavy leg day.
20. As a client with other sports, I want them to appear as days in my plan, so that my week is one schedule instead of two.
21. As a client with a desk job, I want to say so, so that my daily activity is accounted for rather than assumed.
22. As a client who is eating in a deficit, I want to say so, so that the plan does not push me harder than my food supports.
23. As a client with an injury, I want to describe it in my own words, so that the plan avoids movements that would hurt me.
24. As a client with nothing to add, I want every optional question to be genuinely skippable, so that the form takes a minute rather than ten.
25. As a client submitting the questionnaire, I want an animated screen telling me my plan is being composed, so that a forty-second wait does not look like a frozen page.
26. As a client, I want to land on the tracker with my first week visible as soon as generation finishes, so that there is no extra click between answering and training.
27. As a client whose generation failed, I want to be told and offered another attempt, so that I am not stuck on a spinner forever.
28. As a client retrying after a failure, I want my answers to have been kept, so that I do not fill in the questionnaire twice.
29. As a client who abandoned onboarding halfway, I want the tracker's empty state to invite me back into it, so that I have a way back in.
30. As a client who registered before this existed, I want that same invitation, so that an account with no plan is never a dead end.
31. As a client who already has an active plan, I want onboarding to send me to my tracker instead of running again, so that I cannot accidentally destroy the block I am training.
32. As a client, I want my first block to be a sensible number of weeks, so that it ends in a review rather than running forever.
33. As a client, I want my first week created and in flight immediately, so that I can log Monday's sets the day I sign up.
34. As a client, I want my answers stored as my coaching profile, so that the weekly workflow adapts my training from the same facts that produced the plan.
35. As a client, I want to complete my first week and receive an adjusted second week, so that the plan I was given behaves like every other plan in the product.
36. As a client finishing my first block, I want plan turnover to work as normal, so that nothing about a generated first plan makes me a special case later.
37. As a developer, I want the questionnaire payload validated by a schema at the API boundary, so that a wrong field is a rejected request rather than a quietly degraded plan.
38. As a developer, I want the browser's payload type generated from that schema, so that a renamed field breaks the build instead of production.
39. As a developer, I want the answers-to-profile mapping to live on the server, so that there is one place deciding which column each answer belongs to.
40. As a developer, I want generation to refuse a client who already has an active plan, so that no request can archive a live block by accident.
41. As a developer, I want generation to refuse a client with no profile, so that the failure is a clear conflict rather than an unexplained server error.
42. As a developer, I want a repeated generate call after a success to return the plan that already exists, so that a retried request cannot produce a second block.
43. As a developer, I want the first-plan prompt to live beside the other coaching prompts and schemas, so that changing how the product coaches is one place to look.
44. As a developer, I want the generated plan validated by the same schema plan turnover uses, so that both paths produce identical plan documents.
45. As a developer, I want activation to reuse the existing atomic plan-and-week-one command, so that first-plan activation cannot half-succeed.
46. As a coach-facing product, I want the client's declared activities stored in a generically named field, so that the domain is not shaped around one client's sport.
47. As a coach-facing product, I want a full-body day type available, so that a three-day beginner plan can describe itself honestly.
48. As a developer, I want the generated API contract regenerated and committed with the new operations, so that CI's regeneration diff stays green.

## Implementation Decisions

### Domain model changes

- **`swimming` becomes `activities`.** The profile column named after one client's
  sport is renamed and made generic. It stays a free-form JSON column like its
  siblings — nothing reads it structurally except the model — with a documented
  convention of a list of items carrying a name, sessions per week, optional days
  and an optional note. Lucia's seeded swimming data becomes one item in that list.
  This is the only database migration in the phase, and because production carries
  only the default-coach row, no real data is at risk. The rename must be generated
  through drizzle-kit interactively so the migration and its snapshot stay in step.
- **Day types become `upper_body`, `leg_day`, `full_body`, `rest`, `activity`,
  `cardio`.** `swimming` is replaced by the generic `activity`; `full_body` is added
  because the existing enum could not express a beginner's three-day plan, which is
  exactly the plan onboarding will most often produce. Day types live inside JSON
  columns, so this needs no migration — but it touches the domain enum, the
  browser's runtime copy, day labels in the tracker and history screens, both demo
  seeds, and the generated contract.
- **Generated plans are bounded to four to eight weeks.** The bound is added to the
  existing generated-plan schema, so it applies to plan turnover as well. Our own
  parse enforces it after the model responds, whatever the model returns.

### The onboarding payload

- A new typed schema describes the questionnaire answers and is registered as a
  named OpenAPI component, so the browser's payload type is generated rather than
  hand-written. It is a real schema, not a record of unknowns: the goal, experience
  level, daily activity level and eating phase are enums; training days per week is
  a bounded integer; activities are a typed list.
- This is a deliberate tightening at the *write boundary only*. The profile's JSON
  columns stay unvalidated in storage, because the demo seed holds far richer data
  (macro targets, meal schedules, supplements, swim benchmarks) than any onboarding
  vocabulary would allow. Tighten what onboarding writes; do not constrain what a
  profile may contain.

### Modules

- **Onboarding answer schema and mapper (server).** The mapper is the deep module of
  this phase: a pure function from validated answers to a profile write, deciding
  that experience level belongs with strength loads, daily activity with schedule
  preferences, other sports with activities, injuries with notes. No I/O, no
  framework, trivially testable, and the one place that knows the column vocabulary.
- **First-plan prompt builder (server, domain layer).** The system prompt and the
  prompt-building function sit beside the existing plan-generation schemas in the
  pure coach domain — pure strings and serialization, so they respect the domain
  layer's purity boundary, which forbids reaching into persistence, HTTP, workflow
  or agent code. The prompt pins the structure: seven days each appearing once, a
  count of training days equal to what the client said they could train, declared
  activities placed on non-lifting days, and no prescribed weight where the client
  is a beginner or the lift is unknown.
- **Onboarding route.** Accepts the validated answers, maps them, upserts the
  profile, returns it. Composes the mapper and the repository directly, in the same
  shape as the existing profile and auth handlers — no use-case layer.
- **Generate route.** Refuses with a conflict when an active plan exists, and with a
  different conflict when no profile exists; otherwise builds the prompt from the
  stored profile and the coaching rules, makes one structured-output call, and hands
  the validated plan to the existing atomic activation command. Returns the plan and
  week one. It reads the model credentials from the Worker environment the same way
  the workflow-trigger route reads its workflow binding, so application construction
  is unchanged.
- **Onboarding wizard (browser).** A new authenticated route holding four steps and
  a progress indicator, with step state in a reducer local to the route — no store
  slice, no draft persistence. It redirects to the tracker if an active plan already
  exists.
- **Building screen (browser).** A dedicated post-submit view with an animated
  thinking orb (https://github.com/Jakubantalik/thinking-orbs), replacing the wizard while the request is in flight. On success it
  invalidates the tracker resource so the tracker refetches, then navigates there.

### API contract

- `POST /api/me/onboarding` — validated answers in, saved profile out.
- `POST /api/me/plans/generate` — no body; returns the activated plan and week one;
  answers `409 plan_already_active` and `409 profile_required`.
- Both are session-addressed like the rest of `/api/me`: no client identifier
  crosses the wire, and the client comes from the verified cookie.
- Generation is **synchronous** — the browser holds the request for the duration.
  Awaiting the model is I/O rather than CPU, so the Worker CPU ceiling is not the
  constraint; the edge's request timeout is, which is why there is exactly one model
  call and no server-side retry. The client's "try again" is the retry.
- Idempotency reuses the existing activation key column with a deterministic
  per-client value, so a retry after a completed activation returns the plan that
  already exists rather than creating a second. That column's comment widens from
  "the workflow that created this row" to "the workflow — or request — that created
  this row"; it is not renamed.
- The existing profile write route keeps no consumer. Onboarding writes through the
  new route because that is where the typed schema lives; a profile-editing screen
  remains the outstanding gap.
- Plan creation is no longer workflow-only. The route-level comment saying the
  browser never causes a plan to be activated, and the corresponding statement in
  the API contract document, both change.

### Entry and gating

- Registration navigates into onboarding rather than to the root redirect.
- The tracker's empty state stops being a dead end and becomes an invitation into
  onboarding, which also covers anyone who abandoned it or registered earlier.
- The root redirect is left alone: making it plan-aware would put a plan fetch in
  front of every cold page load.
- Onboarding itself redirects away when an active plan exists, so the destructive
  path is closed in the browser as well as in the handler.

### Model and prompt

- The same environment-configured model as every other call in the product, so cost
  and behaviour have one knob.
- One call: profile and coaching rules in, a complete plan document out. The
  workflow's separate profile-summarization step exists mainly to compress a whole
  block of training history, which a first plan does not have, and a second call
  would double a wait the client is sitting through.

## Testing Decisions

A good test here asserts externally observable behaviour: what a request answers,
what ends up stored, what a pure function returns. It does not assert how a handler
is wired, and it does not mock a module to observe a call — the server suite mocks
nothing today, injecting collaborators and using a fake database instead, and this
phase does not change that.

- **The answers-to-profile mapper is tested.** Pure, no setup, and it is where a
  silent regression would degrade every plan the product ever generates. Tests pin
  that each answer lands in the column the model expects to read it from, that
  beginner answers produce a profile with no invented loads, and that skipped
  optional answers do not fabricate values.
- **Both routes are tested at the HTTP level**, in the style of the existing
  application tests: onboarding returns the saved profile; generate answers a
  conflict when an active plan exists and a different conflict when no profile
  exists.
- **The generated path is deliberately not tested.** Nothing stubs the model, so no
  test asserts that a valid generation produces an active plan with an in-flight
  week one. That is verified by hand in local development. The consequence is
  accepted and recorded here: the guards and the schemas are covered, the happy path
  is not.
- **No browser tests this phase.** The wizard is plain form state, and its payload
  type is compiler-checked against the generated contract, which is the guarantee
  that would otherwise have been a test.
- Every issue is expected to land with typecheck, lint and the full test suite green
  through the pre-commit hook.

## Out of Scope

- **Equipment access.** Not asked, so plans assume a commercial gym. Deliberate
  omission; the highest-value follow-up question.
- **A designed failure experience.** Generation failure gets a message and a retry
  button, nothing more — no diagnosis, no partial recovery, no support path.
- **Rate limiting on generation.** Until a plan exists, an authenticated client can
  call generate repeatedly and each call costs tokens. Accepted for now.
- **Regenerating or editing a plan.** "This plan is wrong, do it again" is not a
  feature here; the endpoint generates a first plan and refuses otherwise.
- **Durability.** No workflow, so a failed generation retries nothing on its own.
- **A profile-editing screen.** Onboarding is a one-time write; nothing yet lets an
  client change an answer afterwards.
- **Progress reporting during generation.** The animated screen is decorative, not a
  status feed; the browser learns nothing until the response arrives.
- **Renaming the activation idempotency column** to something that does not say
  "workflow", and tightening the profile's JSON columns generally.

## Further Notes

- The weekly workflow already depends on a profile row existing and throws without
  one, which is the structural reason onboarding must write a real profile rather
  than pass answers straight to the model. Everything a client tells onboarding is
  therefore still readable in week two, when the workflow re-reads the profile to
  adapt training. Nothing collected is prompt-only.
- The coaching rules document is what determined the question list, not intuition:
  it names nutrition adequacy, compounding daily activity, and rest-day activity
  preferences as inputs to progression. Every question earns its place by feeding a
  rule.
- Two simultaneous submissions can both pass the active-plan check, but the second
  activation then violates the one-in-flight-week-per-client index and the whole
  batch rolls back. The loser sees a server error and the database stays correct:
  one active plan, one in-flight week.
- The animated orb is a third-party component the client-facing screen embeds; if
  its export drags in a WebGL or canvas dependency, weigh the bundle cost of a
  screen shown once per account before adopting it.
- The demo seed's data shape stays the reference for how rich a profile may become.
  Onboarding writes a much thinner profile than Lucia's, and both must remain valid.
