# 007 — Entry points and guards

## Parent PRD

`issues/prd.md`

## What to build

Onboarding exists but nothing routes anyone into it, and nothing stops someone
running it twice. This slice closes both.

Registering takes the client into the questionnaire rather than to the root
redirect. The tracker's empty state — currently a dead end that says there is no
plan and offers nothing — becomes the invitation back in, which is also what
catches anyone who abandoned the questionnaire halfway or registered before this
phase shipped. The onboarding route itself redirects to the tracker when an
active plan already exists, so the destructive path is closed in the browser as
well as in the handler that refuses it.

The root redirect is deliberately left alone: making it plan-aware would put a
plan fetch in front of every cold page load, for a decision that only matters
immediately after registration.

See "Entry and gating" in the parent PRD.

## Acceptance criteria

- [ ] Completing registration lands on the questionnaire.
- [ ] The tracker's empty state invites the client into onboarding, and its copy
      no longer implies there is nothing to be done.
- [ ] Visiting the onboarding route with an active plan redirects to the tracker
      without rendering the questionnaire.
- [ ] The root redirect performs no plan lookup and behaves as it does today.
- [ ] A client who abandons the questionnaire and returns later can reach it
      again from the tracker, with the form in its initial state.
- [ ] Typecheck, lint and the full test suite pass.

## Blocked by

- Blocked by `issues/003-generate-the-first-plan.md` — the guard depends on a
  plan being creatable from the browser, and the empty-state invitation should
  lead somewhere that works end to end.

## User stories addressed

- User story 1
- User stories 29, 30
- User story 31

## STATUS

DONE
