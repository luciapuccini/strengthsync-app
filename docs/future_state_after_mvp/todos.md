# Post-MVP todos

Notes only — not designs. Pointers into existing docs where they already cover the topic.

- **Chat AI — my profile:** coach chat grounded in the athlete profile. (See deferred notes in [workflows.md](../architecture/workflows.md).)
- **Stripe:** paid access / payment method.
- **Braintrust:** wire LLM traces and evals. (See [evals.md](../architecture/evals.md), [stack.md](../architecture/stack.md).)
- **App Store?:** possibly a React Native client later.
- **LLM cost budget:** project spend limit, model allowlist, per-workflow token cap. (See [stack.md](../architecture/stack.md).)
- **Auto-trigger week workflow:** e.g. start complete-week when the last day of the week is saved. (See [workflows.md](../architecture/workflows.md).)
- **Password reset.** (Out of MVP auth scope in [stack.md](../architecture/stack.md).)
- **SSO / social sign-in** (Apple, Google, etc.). (Out of MVP auth scope in [stack.md](../architecture/stack.md).)
- **Onboarding draft state:** progressive reducer + resume after refresh/later. Decide if Zustand helps. (See [onboarding-draft-state.md](./onboarding-draft-state.md).)
