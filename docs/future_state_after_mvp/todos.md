# Post-MVP todos

Notes only — not designs. Pointers into existing docs where they already cover the topic.

- **Chat AI — my profile:** coach chat grounded in the athlete profile. (See deferred notes in [workflows.md](../architecture/workflows.md).)
- **Stripe:** paid access / payment method.
- **Braintrust:** wire LLM traces and evals. (See [evals.md](../architecture/evals.md), [stack.md](../architecture/stack.md).)
- **App Store?:** possibly a React Native client later.
- **LLM cost budget:** project spend limit, model allowlist, per-workflow token cap. (See [stack.md](../architecture/stack.md).)
- **Auto-trigger week workflow:** e.g. start complete-week when the last day of the week is saved. (See [workflows.md](../architecture/workflows.md).)
- **Password reset.** (Out of MVP auth scope in [stack.md](../architecture/stack.md).)
- show password in field 
- feedback on initial plan generated 
- **SSO / social sign-in** (Apple, Google, etc.). (Out of MVP auth scope in [stack.md](../architecture/stack.md).)
- **Onboarding draft state:** progressive reducer + resume after refresh/later. Decide if Zustand helps. (See [onboarding-draft-state.md](./onboarding-draft-state.md).)
- **`day_index` no longer means a weekday.** Onboarding asks for the "usual rest
  day" by name and stores it as `schedule_preferences.rest_day` on the ISO
  convention `1 = Monday` (`server/src/domain/onboarding/schema.ts:82`,
  `ONBOARDING_WEEKDAYS` in `client/src/lib/onboarding-schema.ts`). Since issue
  003 anchored week 1 to the activation day, `day_index 1` is that day instead,
  so an athlete who signs up on a Wednesday and said "I rest on Sundays" gets a
  rest day on Tuesday — and the offset chains forward through every later week.
  Accepted for the invited cohort: a rest day on the wrong weekday is a smaller
  problem than a week whose first days are already in the past. Planned out in
  [day-index-weekday-mapping.md](../kanban/day-index-weekday-mapping.md) —
  `day_index` goes back to meaning an ISO weekday and the seven-day window is
  rotated onto it. Cheapest before the first invite batch, since after that it
  also needs a backfill of `weeks.schedule`.
- captcha or any gate to prevent fake usrs?

