# Auth0's built-in email sender is NO WORKING

Two of your notes are the same subject and are merged here: the question of *why*
a custom email provider is needed, and the incident that answered it. On
2026-08-21 the set-password emails were triggered at ~11:00 and had still not
arrived in test mailboxes at 18:43 — **seven and a half hours**, observed, not
estimated. The invite email is the athlete's first contact with the product and
the only way into an account; a seven-hour first step is not a beta, it is a
dropped funnel.

## Why this is worse than what was already tracked

`docs/todos/008-launch-readiness.md` and
`docs/architecture/auth.md` (§ *Deliberately absent*) both already flag the
built-in sender, but on **deliverability** grounds: `no-reply@auth0user.net` is
unconfigurable and has no SPF or DKIM alignment with `strengthsync.ai`, so the
invite looks like phishing. Both documents conclude the built-in sender is
"acceptable at this volume".

That conclusion was reached before 2026-08-21 and the incident breaks it.
Deliverability was a probabilistic risk you could mitigate with a heads-up
email; latency is not — it applies to every recipient, and no amount of warning
someone an email is coming makes it come. Auth0's built-in provider is
explicitly a development-grade, rate-limited, best-effort queue; the observed
delay is that queue behaving as documented, not an outage to wait out. So the
"acceptable at this volume" line in `auth.md:311` should be re-taken rather than
inherited.

## The second thing you wanted, which the provider also unblocks

Your note asks for "a follow-up email after verification steps". Auth0's built-in
sender only emits the templates it owns — verify email, reset password, blocked
account — and cannot send an arbitrary message when an athlete finishes setting
their password. Getting that needs either a real SMTP provider wired as the
tenant's email provider, or an Auth0 Action on post-login calling out to
something else. Worth deciding as one thing, not two: the provider choice and
the welcome-email mechanism land in the same place.

## Constraints already established — do not re-derive

- **Loops.so cannot be the Auth0 provider.** It is API-only with no SMTP relay
  (`docs/architecture/auth.md:309`). Loops is already in use for the marketing
  waitlist in the *other* repository, so the instinct to reuse it is natural and
  wrong for this slot. It could still send the post-verification follow-up via an
  Action.
- **Candidates are SendGrid, Mailgun, or SES**, each configured as the tenant's
  custom email provider with a verified `strengthsync.ai` sending domain — which
  also closes the SPF/DKIM gap, so one change answers both notes and 008's
  sending-domain criterion at once.
- **Account creation stays manual either way.** The M2M application is scoped to
  `read:users` and `delete:users` and cannot create anyone
  (`docs/operations/onboard_beta_user.md`). This card changes how the invite is
  *delivered*, not how the account is made.

## Open before it can be sliced

- Which provider, and is a verified sending domain on `strengthsync.ai` in
  conflict with the marketing repo's use of the same domain for Loops? Two
  senders on one domain is normal but the DNS records have to coexist.
- Does the follow-up email go through the same provider, or through Loops via an
  Action, given Loops already holds the contact record from the waitlist?

---

## Category

**2. Bug** — reported from a real observation during development, with a date, a
duration, and a reproducible cause. Filed as a bug rather than house cleaning
because it is not a configuration we have been meaning to get around to: it is a
component that is currently failing at its job.

---

## Priority

**1. Top** — it gates the invite batch, which gates the entire MVP. The success
metric in `docs/mvp.md` is "the share of invited users who sign up, get a plan,
and log at least one complete training day", and step zero of that funnel is an
email arriving. With a seven-hour delay, a low sign-up number cannot be told
apart from a slow mailbox — which is the exact failure mode `docs/mvp.md` already
rejected the "completed a week" metric for. Shipping the cohort on the built-in
sender means the experiment cannot produce a finding.

Your own note said "out of scope for MVP but sooner than later". The incident
moved it: this is now in scope, and it is a blocker on
`docs/todos/008-launch-readiness.md`'s last two criteria rather than a
post-MVP item.

---

## Original notes

> Why do we need to set up a custom email provider with Auth0? 1. verification
> emails now are batched and queuqed -> slow invite to app. + setting a follow up
> email after verification steps (either STMP provider or enterprise account).
> Out of scope for MVP but sooner than later

> URGENT: Auth0 verification emails sent 2026-08-21 ~11:00am still not received by
> test user accounts as of 18:43pm (7+ hr delay). Not acceptable for beta users -
> need to configure a custom email provider (SMTP/SendGrid/etc) with Auth0 to fix
> delivery speed before beta launch.
