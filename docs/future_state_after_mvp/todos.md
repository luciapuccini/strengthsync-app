# Post-MVP todos

Notes only — not designs. Pointers into existing docs where they already cover the topic.

- **Chat AI — my profile:** coach chat grounded in the athlete profile. (See deferred notes in [workflows.md](../architecture/workflows.md).)
- **Stripe:** paid access / payment method.
- **Braintrust:** wire LLM traces and evals. (See [evals.md](../architecture/evals.md), [stack.md](../architecture/stack.md).)
- **App Store?:** possibly a React Native client later.
- **LLM cost budget:** project spend limit, model allowlist, per-workflow token cap. (See [stack.md](../architecture/stack.md).)
- **Auto-trigger week workflow:** e.g. start complete-week when the last day of the week is saved. (See [workflows.md](../architecture/workflows.md).)
- feedback on initial plan generated 
- **Onboarding draft state:** progressive reducer + resume after refresh/later. Decide if Zustand helps. (See [onboarding-draft-state.md](./onboarding-draft-state.md).)
- **Account deletion can leave rows behind.** `DELETE /api/account` deletes the
  Auth0 user, then the `client_identities` row, then cascades weeks, plans,
  profile and the `clients` row — with no transaction spanning Auth0 and D1, and
  none spanning D1's own statements. A failure anywhere in the cascade leaves
  training data with no identity pointing at it. Those rows are unreachable by
  construction (every request arrives as a subject, and that subject maps to
  nothing), so nothing can read them and nothing grows from them, but App Store
  Guideline 5.1.1(v) is about the data actually going. The correct version needs
  a marker write plus a Cron Trigger that retries both halves: a new status, a
  `scheduled` handler and a purge job. Deliberately not built for twenty
  athletes — a manual sweep instead. Reasoning in
  `server/src/lib/account-deletion.ts` and
  [auth.md](../architecture/auth.md#account-deletion).

- **A real transactional email provider.** Auth0's built-in sender is
  rate-limited and sends from `no-reply@auth0user.net`, which is not
  configurable. Tracked where it actually bites, in
  [008-launch-readiness.md](../todos/008-launch-readiness.md) — it gates the
  invite batch rather than being post-MVP. Loops.so cannot serve this role: it
  is API-only with no SMTP relay.

Four entries left this list with the Auth0 migration (`issues/015`), because the
identity provider owns them rather than because they were built here: **password
reset**, **SSO / social sign-in**, **show password in field** — all three are
properties of the hosted login page — and **captcha / a gate against fake
users**, answered more completely by disabling public sign-ups than a gate would
have been. See [auth.md](../architecture/auth.md).
