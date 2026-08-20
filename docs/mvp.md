# MVP: what is missing to go to production

What this repository has to ship before real strangers can use it, and what
ending the MVP looks like. Decisions only — the implementation is sliced into
`issues/` separately.

## What this project proves

**That the product works.** Whether anyone wants it is a different question,
owned by a different project: the `strengthsync` repository's waitlist and its
ad spend measure demand. One objective per project.

So the traffic here is not ad traffic. It is a small invited cohort, each of
whom is handed the URL and an account created for them by hand, whose job is to
answer two questions the waitlist cannot: does an athlete who signs up actually train off the plan, and
is what the model produced any good.

## Success metric

**The share of invited users who sign up, get a plan, and log at least one
complete training day.**

Chosen over the two neighbours on purpose. *Reaching `/track` with an active
plan* is measurable in one session but only proves the pipe is connected.
*Completing a week and receiving an adapted week 2* is the real product promise,
but it is seven days out and there is no email provider — a low number could not
be told apart from people simply forgetting, so it would not be a finding.

Logging a real training day is the first moment the athlete acts on what the LLM
produced, and it lands within 24–48 hours of the invite.

## Exit criterion

Around **20 invited users over two weeks**, in one or two batches. Then read the
funnel, read every generated plan by hand, and decide.

Twenty is deliberately small: reading each plan is the point of monitoring LLM
responses, and it does not survive contact with a larger cohort. Two weeks also
sits inside Workers Logs retention, which the LLM monitoring below depends on.

## Scope

| # | Item | Where |
| --- | --- | --- |
| 1 | Serve the app from `app.strengthsync.ai` | `server/wrangler.jsonc` |
| 2 | ~~Invite code gate on sign-up~~ → **superseded**: public sign-ups disabled at the identity provider | `issues/auth0-migration/` |
| 3 | Anchor the first week to today, not to Monday | `server/src/db/repositories/plans.ts:80` |
| 4 | Put `complete-week` behind the session guard | `server/src/routes/wf/endpoints.ts`, `client/src/api/workflows.ts` |
| 5 | PostHog funnel events | `client` |
| 6 | Structured LLM call logs | `server/src/agent/agent-core.ts` |
| 7 | Privacy policy and terms, linked from the hosted login page | marketing repo + Auth0 dashboard |
| 8 | OpenAI monthly spend cap | OpenAI console, no code |

### 1. Domain

`strengthsync.ai` already runs on Cloudflare nameservers, so this is a `routes`
entry with `custom_domain: true` — no DNS migration and no registrar work.

There is no session cookie to keep off the apex any more — the API takes a
bearer token, which is sent to exactly the host the client addresses and nowhere
else. The separation this paragraph used to argue for is now a property of the
credential rather than something to configure.

### 2. Invite code gate — superseded, not delivered differently

**Deleted rather than adapted**, by `issues/011-amputate-old-auth.md`. Public
sign-ups are switched off at the identity provider's database connection, and
every account is created by hand through the dashboard. There is no gate to
bypass when nothing self-serve exists to gate.

The reasoning this section carried survives intact and is worth keeping, because
it is what the rest of the security scope still hangs off. Every new athlete
triggers a paid structured model call, and there is no rate limit anywhere in the
repository, so **captcha, rate limiting and abuse handling are not in this
MVP** — they are answers to a question that cannot be asked.

What changed is the strength of the answer. A code was a shared secret: leaked,
it meant open sign-up until rotated, and a client-side gate would not have been
one at all — the provider's signup endpoint is publicly callable with only a
client id, so a screen in our own bundle stops nobody who looks. Disabled
sign-ups have no secret to leak and nothing to rotate. Cohort attribution, which
the code gave for free, now comes from the email address stored on
`client_identities`.

See [auth.md](./architecture/auth.md).

### 3. First week anchored to today

`activateGeneratedPlan` currently pins week 1 to `startOfISOWeek(todayIso())`.
Sign up on a Friday and days 1–4 of the plan are already in the past — unloggable
days the athlete never trained. Roughly five in seven new users land in that
state, and lifting days usually fall on Monday/Wednesday/Friday, so most of them
open the tracker to a week that is mostly spent.

That is a direct attack on the success metric above, which is why it is in scope
rather than on the post-MVP list where it started.

The fix is one line in the repository, not in the prompt: `buildFirstPlanPrompt`
sends only `{coaching_rules, profile}` and the model emits a `day_index` 1–7
template with no notion of dates. Setting `start` to today and `end` to today + 6
maps that template onto the next seven days. Later weeks already chain off
`completedWeek.end_date + 1`, so the offset stays consistent for that athlete
forever.

### 4. `complete-week` behind the session guard

`POST /wf/complete-week` is unauthenticated and reads `clientId` from the request
body, then calls `STRENGTHSYNC_WORKFLOW.create` with it. On a public domain that
means any caller can complete a stranger's in-flight week — freezing their log
and replacing next week — at a cost of two to three paid model calls, and can
spawn unbounded workflow instances with random UUIDs before any lookup fails.

Mounting it under `/api/*` and reading the athlete from the cookie closes both,
and removes the last place a `clientId` crosses the wire — an anomaly
`api_contracts.md` already flags. The contract changes, so `openapi.json` and
`openapi.d.ts` are regenerated; CI fails otherwise.

### 5. PostHog

Client-side, **autocapture off**, one hand-written event per funnel step:
onboarding step completed, plan generation started, plan generation
succeeded/failed with latency, first set logged, day saved, week completed.
`identify(clientId)` on session bootstrap ties the funnel to an athlete.

Autocapture is off because this is a logged-in health app: it would sweep up far
more about real users than the funnel needs, for no gain over six explicit
events.

Week completion is instrumented but does not gate the MVP — it is the seven-day
signal we chose not to depend on.

Open implementation detail: whether to proxy ingestion through the Worker to
survive ad blockers, the way the marketing site does with its `/ingest` rewrites.
`run_worker_first` makes it easy, but it is not required for a mobile cohort.

### 6. Structured LLM logs

A JSON line per model call from inside `getAgentRuntime`, capturing prompt,
output, model, latency, error, and `result.usage` — token usage is returned by
the AI SDK today and dropped on the floor, and it is also the cost data.

All six call sites go through that one function (`plan-turnover.ts` ×3,
`strengthsync-workflow.ts` ×2, `plans/endpoints.ts` ×1), so this is one change,
not six. Workers Logs is already enabled with `invocation_logs`.

This is deliberately *not* the design in [architecture/evals.md](./architecture/evals.md).
Braintrust stays post-MVP, and no `llm_trace` table is added. For twenty users
whose plans are going to be read by hand, a log line is enough, and building a
tracing layer we intend to replace is not.

What already survives without this, and is worth knowing before reaching for the
logs:

- **Final outputs are product rows.** `plans.week_template`, `plans.rationale`
  and `weeks.schedule` are what the model returned — they can be read with SQL
  today, permanently.
- **Intermediate steps live in the workflow.** `summarize-profile`,
  `summarize-history` and `analyze-week` never become rows, but `step.do` records
  every step's output for replay, so they are inspectable per instance through
  Workflows — one at a time, not in aggregate, and not forever.
- **Nothing captures the input.** The prompt as actually sent, the model that
  answered, latency, errors and token usage exist nowhere. That is the gap.

### 7. Privacy policy and terms

Static pages on the marketing site, linked from the hosted login page (Auth0
dashboard → Branding, which is where the only remaining pre-sign-in screen
lives). They
have to name what is collected, that health-adjacent data (sex, age, body
composition, injury notes) is sent to OpenAI, and how to request deletion.

No cookie consent banner: PostHog here is first-party product analytics over a
small invited cohort, and a consent gate would visibly dent the funnel numbers
this MVP exists to measure. Revisit before any open launch.

### 8. Spend cap

A hard monthly limit in the OpenAI console. No code, and it is the real backstop
regardless of what the application does — a retry loop does not respect a closed
sign-up. Hitting the cap surfaces as API errors rather than graceful
degradation; at this cohort size that is the right trade.

## Pre-launch checks

Not build items — things to confirm once, cheaply, before the first invite goes
out.

- **Log a set on a real phone.** The metric depends on it. The tracker looks
  mobile-first (`exerciseRow.tsx` is flex with `min-w-0`, and the only `<table>`
  is in history, off the critical path), but it has not been driven on a device.

Two checks that were here are answered, in `issues/001-serve-app-subdomain.md`:
the session cookie no longer derives `Secure` from `NODE_ENV` — a build-time
substitution that decided a production security flag from the deploying shell —
and sets it unconditionally; and the `database_id` was confirmed against
`wrangler d1 info strengthsync` to be the production database, not the
placeholder its comment claimed.

## Out of scope

Everything in [future_state_after_mvp/todos.md](./future_state_after_mvp/todos.md)
stays there: Stripe, chat AI on the profile, Braintrust, a React Native client,
the auto-triggered week workflow, password reset, SSO and social sign-in,
show-password, feedback on the initial plan, and onboarding draft state.

Two changes to that list:

- **The mid-week plan bug moves in** (scope item 3). It stopped being a nice-to-have
  when the success metric became "logged a training day".
- **Captcha comes off entirely.** Disabled public sign-ups answer it, more
  completely than the invite gate would have.

## Accepted risks

| Risk | Why it is accepted |
| --- | --- |
| ~~No password reset~~ | **Resolved.** Auth0 owns password reset; the recovery link on the hosted page is real. `hash-password.ts` and the credentials table no longer exist |
| Workers Logs retention is days, so week-2 `analyze-week` traces may age out unread | The two-week window is sized around it; read the logs during the run, not after |
| Prompts contain health data and will sit in logs | Small cohort, short retention, disclosed in the privacy policy |
| ~~A leaked invite code is open sign-up until rotated~~ | **Resolved.** There is no code. Public sign-ups are off at the connection, so there is no self-serve path to leak a way into |
| Hitting the OpenAI cap fails user-visibly | Preferable to an uncapped bill at this stage |

## Dependency outside this repository

The invited cohort comes from the `strengthsync` waitlist, so that repository has
to be able to collect emails before this one has anyone to invite. Its MVP is
tracked separately.
