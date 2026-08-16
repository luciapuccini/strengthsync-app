# 007 — Privacy and terms links on sign-up

## Parent PRD

`docs/mvp.md`

## What to build

The app-side half of `docs/mvp.md` §7: link the privacy policy and terms from the
sign-up screen, so an athlete agrees to something that exists before handing over
health-adjacent data.

**The pages themselves are not this repository's work.** They are static pages on
the marketing site and belong to the `strengthsync` repository's own MVP — one
objective per project. This issue exists so that dependency is visible from here
rather than only in a conversation, and it cannot close while the links 404.

What the pages have to say, because it constrains what this repo may do: what is
collected, that health-adjacent data (sex, age, body composition, injury notes)
is sent to OpenAI, and how to request deletion. The LLM logs from issue 006 put
prompts containing that data into Workers Logs, which the policy has to cover.

No cookie consent banner. PostHog here is first-party product analytics over a
small invited cohort, and a consent gate would visibly dent the funnel numbers
this MVP exists to measure. Revisit before any open launch — that decision is
scoped to the invited cohort, not to the product.

**HITL:** blocked on pages published in another repository, and the copy is a
human call.

## Acceptance criteria

- [ ] Sign-up links to the privacy policy and the terms, and both resolve
- [ ] The privacy policy names OpenAI as a processor of health-adjacent data and
      gives a deletion route
- [ ] No consent banner is added
- [ ] The links survive the sign-up screen changes from issue 002

## Blocked by

- Blocked by `issues/002-invite-code-gate.md` — not a real dependency, both edit
  the sign-up screen; ordering avoids the conflict
- Blocked externally by the privacy and terms pages existing in the
  `strengthsync` repository

## PRD sections addressed

- Scope item 7 (Privacy policy and terms)
- Accepted risk: prompts contain health data and will sit in logs

## STATUS

TODO
