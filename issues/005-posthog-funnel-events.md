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

- [ ] PostHog initialised with `autocapture: false`, key from an env var, not
      committed
- [ ] `identify(clientId)` fires on session bootstrap
- [ ] All seven events above fire from the client at the right moments
- [ ] Plan generation success and failure both carry a latency property
- [ ] The events are confirmed arriving in the PostHog project, and a funnel from
      sign-up to first day saved can be built from them
- [ ] Nothing is captured before a session exists beyond the sign-up funnel steps
      themselves

## Blocked by

None — can start immediately.

## PRD sections addressed

- Scope item 5 (PostHog funnel events)
- Success metric — this is how it gets measured

## STATUS

TODO
