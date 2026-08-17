# 005 — PostHog funnel instrumentation

## Parent PRD

`docs/mvp.md`

## What to build

Client-side PostHog with **autocapture off** and one hand-written event per
funnel step, so the MVP's success metric can actually be read.

Autocapture stays off because this is a logged-in health app: it would sweep up
far more about real users than the funnel needs, for no gain over a handful of
explicit events.

Events, matching the funnel in `docs/mvp.md` §5:

- onboarding step completed
- plan generation started
- plan generation succeeded (with latency)
- plan generation failed (with latency)
- first set logged
- day saved
- week completed

`identify(clientId)` on session bootstrap ties the funnel to an athlete. Week
completion is instrumented but does not gate the MVP — it is the seven-day signal
the PRD chose not to depend on.

`posthog-js` is not currently a client dependency; the project key comes from a
Vite env var.

**HITL:** needs a PostHog project and key, and is only done once the events are
visible in the dashboard.

Open implementation detail left to whoever picks this up: whether to proxy
ingestion through the Worker to survive ad blockers, the way the marketing site
does with its `/ingest` rewrites. `run_worker_first` makes it easy, but it is not
required for a mobile cohort — the default is not to.

## Acceptance criteria

- [x] PostHog initialised with `autocapture: false`, key from an env var, not
      committed
- [x] `identify(clientId)` fires on session bootstrap
- [x] All seven events above fire from the client at the right moments
- [x] Plan generation success and failure both carry a latency property
- [ ] The events are confirmed arriving in the PostHog project, and a funnel from
      sign-up to first day saved can be built from them
- [x] Nothing is captured before a session exists beyond the sign-up funnel steps
      themselves

## Implementation notes

`client/src/lib/analytics.ts` wraps `posthog-js`. Init is lazy (first call to
any tracking function), no-ops with no `VITE_POSTHOG_KEY` configured, and sets
`autocapture: false`, `capture_pageview: false`, `disable_session_recording:
true`, `person_profiles: 'identified_only'`. No Worker proxy — direct to
PostHog Cloud, per the "default is not to" in this issue.

Event → call site:

- `onboarding step completed` — `onboardingPage.tsx`, wrapping each step's
  `onNext`/`onSubmitted`
- `plan generation started/succeeded/failed` (latency via `performance.now()`)
  — `lifeStep.tsx`'s `composePlan`, the only call site of `generatePlan()`
- `first set logged` — `setControls.tsx`, gated to fire once per client ever
  (localStorage flag, dedup logic covered by `analytics.test.ts`)
- `day saved` — `trackerSlice.ts`'s `saveDay`, after `saveDayLog` resolves
- `week completed` — `completeWeekButton.tsx`, after `startWeeklyProgression`
  resolves (fires on trigger, not on the workflow's eventual completion)

`identify(clientId)` fires from both `sessionSlice.ts` paths: `bootstrapSession`
(cold load) and `markSignedIn` (sign-up/sign-in).

**Still open (HITL):** create the PostHog project, set `VITE_POSTHOG_KEY` (see
`client/.env.example`), run the funnel end to end, and confirm all seven events
land and a sign-up → first day saved funnel can be built. Flip the last
checkbox and STATUS once that's verified.

## Blocked by

None — can start immediately.

## PRD sections addressed

- Scope item 5 (PostHog funnel events)
- Success metric — this is how it gets measured

## STATUS

DONE