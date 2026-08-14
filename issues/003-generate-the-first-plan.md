# 003 — Generate the first plan

## Parent PRD

`issues/prd.md`

## What to build

The payoff: submitting the questionnaire now produces a training block and week
one, and lands the client on the tracker looking at their first session.

A first-plan system prompt and prompt builder join the existing coaching prompts
and schemas in the pure domain layer — pure strings and serialization, so they
respect that layer's rule against reaching into persistence, HTTP, workflow or
agent code. The prompt pins the structure the parent PRD describes: seven days
each appearing exactly once, a count of training days equal to what the client
said they could train, declared activities placed on non-lifting days, and no
prescribed weight where the client is a beginner or a lift is unknown.

A generate endpoint refuses a client who already has an active plan, refuses a
client with no profile, and otherwise makes exactly one structured-output call
and hands the validated result to the existing atomic plan-and-week-one
activation command. It is synchronous: the browser holds the request. There is no
server-side retry, because a second attempt would push the total wall time toward
the edge's request timeout — the retry is the client pressing the button again.

The browser's submit now chains onboarding and generation, invalidates the
tracker resource so it refetches, and navigates to the tracker. A plain spinner
is fine here; the composing screen arrives in `issues/006-building-screen.md`.

See "API contract" and "Model and prompt" in the parent PRD.

This slice is human-in-the-loop because the parent PRD deliberately leaves the
generated path untested — whether a generated plan is actually 

*good* is a
judgement made by hand against a real key.

## Acceptance criteria

- [ ] The first-plan system prompt and prompt builder live beside the existing
      plan-generation schemas in the pure domain layer, and that layer's purity
      boundary still passes lint.
- [ ] The generated-plan schema bounds a block to four to eight weeks; the bound
      is enforced by our own parse after the model responds, and applies to plan
      turnover too.
- [ ] `POST /api/me/plans/generate` takes no body and returns the activated plan
      and week one.
- [ ] It answers a conflict with a distinct code when an active plan already
      exists, and a different conflict code when the client has no profile.
      Neither case reaches the model.
- [ ] Activation reuses the existing atomic command, keyed so that a repeat call
      after a completed activation returns the plan that already exists rather
      than creating a second one. The key column's comment is widened to say it
      may name a request rather than a workflow.
- [ ] Model credentials are read from the Worker environment the same way the
      existing workflow-trigger route reads its binding; application construction
      is unchanged.
- [ ] HTTP-level tests cover both conflict responses.
- [ ] The route comment and the API-contract document stop saying that plan
      creation is workflow-only, since the browser can now cause an activation.
- [ ] The generated contract is regenerated and committed.
- [ ] Verified by hand against a real key: a new account completes the
      questionnaire and arrives on the tracker with an active plan and an
      in-flight week one whose training days match the answer given.
- [ ] Typecheck, lint and the full test suite pass.

## Blocked by

- Blocked by `issues/002-questionnaire-writes-a-profile.md` — generation reads the
  profile that slice writes.

## User stories addressed

- User story 13
- User story 17
- User story 26
- User stories 32, 33
- User stories 40, 41, 42, 43, 44, 45

## STATUS

DONE
