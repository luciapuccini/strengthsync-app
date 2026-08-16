# 008 — Launch readiness checklist

## Parent PRD

`docs/mvp.md`

## What to build

No code. The last gate before the first invite email goes out.

**OpenAI spend cap.** A hard monthly limit in the OpenAI console. It is the real
backstop regardless of what the application does — a retry loop does not respect
the invite gate. Hitting the cap surfaces as API errors rather than graceful
degradation; at twenty users that is the accepted trade (`docs/mvp.md` §8).

**Log a set on a real phone.** The success metric is "logged a complete training
day", and that path has never been driven on a device. The tracker looks
mobile-first — `exerciseRow.tsx` is flex with `min-w-0`, and the only `<table>` is
in history, off the critical path — but looking is not the same as doing. Run the
whole path on the deployed host: sign up with a code, complete onboarding, wait
out plan generation, log a full day, save it.

**Mint the first batch code.** Generate the invite code for batch one and set it
as the Worker secret, so the emails have something to carry.

Anything this turns up is a finding, not necessarily a fix — record it, then
decide whether it blocks the invite.

## Acceptance criteria

- [ ] A monthly spend limit is set in the OpenAI console and the amount is
      written down here
- [ ] A complete training day has been logged on a real phone against
      `app.strengthsync.ai`, through a real generated plan
- [ ] The batch-one invite code is set as a Worker secret in production
- [ ] Any defect found on the phone run is recorded — either fixed, or written
      into `docs/future_state_after_mvp/todos.md` with a note that it was seen
      and accepted

## Blocked by

- Blocked by `issues/001-serve-app-subdomain.md`
- Blocked by `issues/002-invite-code-gate.md`
- Blocked by `issues/003-anchor-first-week-to-today.md`

## PRD sections addressed

- Scope item 8 (Spend cap)
- Pre-launch check: log a set on a real phone
- Exit criterion — this is what starts the two-week clock

## STATUS

TODO
