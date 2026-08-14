# 009 — PRD implementation sweep

## Parent PRD

`docs/mvp.md`

## What to build

A final read over everything issues 001–008 produced, before the first invite
batch is treated as a real experiment. Not new work — an audit, answered in
writing.

**Are we on track with what we planned for?** Every scope item in `docs/mvp.md`
is either shipped or explicitly dropped, with the drop written down. The success
metric is measurable end to end today: sign-up → plan → first complete day logged,
readable in PostHog without hand-assembly.

**What diverged from project standards?** Name the files and functions that went
their own way — a new layer where the sibling area composes directly, a payload
shape pinned by a test instead of by a Zod schema at the boundary, a route that
does not follow the `createRoute` + `openapi` shape the rest of `server/src/routes`
uses. Note whether the divergence was warranted.

**Are out-of-scope findings documented and not actioned?** Anything spotted along
the way — especially on the real-phone run in issue 008 — is in
`docs/future_state_after_mvp/todos.md` rather than quietly fixed or quietly
forgotten.

**Was `/docs` updated with the progress?** Specifically:
`docs/architecture/api_contracts.md` no longer flags `complete-week` as an MVP
gap; `docs/future_state_after_mvp/todos.md` has the mid-week plan bug removed
(it moved into scope as issue 003) and captcha removed entirely (the invite gate
made it moot); and `docs/architecture/evals.md` still describes the post-MVP
Braintrust target, with the logs-only deviation recorded in `docs/mvp.md` §6
rather than smuggled into the architecture doc.

**Suggested next steps.** Given what the sweep found, what should happen after
the two-week window closes.

## Acceptance criteria

- [ ] Each of the five questions above is answered in writing
- [ ] Every `docs/mvp.md` scope item is marked shipped or dropped, drops
      justified
- [ ] Divergences from project conventions are listed with file and function
- [ ] Out-of-scope findings live in `docs/future_state_after_mvp/todos.md`, not
      in this issue
- [ ] The doc updates listed above have actually been made
- [ ] Next steps are proposed, not decided

## Blocked by

- Blocked by `issues/001-serve-app-subdomain.md`
- Blocked by `issues/002-invite-code-gate.md`
- Blocked by `issues/003-anchor-first-week-to-today.md`
- Blocked by `issues/004-complete-week-behind-session.md`
- Blocked by `issues/005-posthog-funnel-events.md`
- Blocked by `issues/006-structured-llm-logs.md`
- Blocked by `issues/007-privacy-terms-links.md`
- Blocked by `issues/008-launch-readiness.md`

## PRD sections addressed

- All of `docs/mvp.md`

## STATUS

TODO
