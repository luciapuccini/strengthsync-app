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

**Decide whether the invite email can go out from `auth0user.net`.** Found while
completing `issues/010-auth0-tenant-setup.md`: Auth0's built-in email provider
sends from `no-reply@auth0user.net` and that address is not configurable — only
replacing the provider changes it. The concern is deliverability rather than
branding. The sending domain has no SPF or DKIM alignment with
`strengthsync.ai`, so the athlete's first contact with the product is an
unrecognised sender asking them to set a password, which is also a fair
description of a phishing email. Twenty invites is a small enough batch that spam
placement is invisible in aggregate and fatal individually.

Two ways out, both cheap relative to a silent 30% non-delivery: send a plain
personal email ahead of the invite so the athlete is expecting it, or stand up a
real provider (SendGrid, Mailgun, SES) with a verified `strengthsync.ai` sending
domain. The PRD lists a transactional provider as out of scope for the migration;
that decision was made on branding grounds, before the deliverability angle was
visible, so it is worth re-taking here rather than inheriting.

Anything this turns up is a finding, not necessarily a fix — record it, then
decide whether it blocks the invite.

## Acceptance criteria

- [x] A monthly spend limit is set in the OpenAI console and the amount is
      written down here
- [ ] A complete training day has been logged on a real phone against
      `app.strengthsync.ai`, through a real generated plan
- [x] The batch-one invite code is set as a Worker secret in production
- [ ] Any defect found on the phone run is recorded — either fixed, or written
      into `docs/future_state_after_mvp/todos.md` with a note that it was seen
      and accepted
- [ ] A decision is recorded on the invite email's sending domain — either a
      provider is configured with a verified `strengthsync.ai` sender, or the
      vendor sender is accepted in writing with the mitigation that was chosen
- [ ] One invite email has been delivered to a real athlete-typical mailbox
      (Gmail, iCloud) and checked for spam placement, not just for arrival

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
