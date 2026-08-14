# Onboarding draft state

Out of MVP scope.

- Push onboarding form answers progressively into a reducer as the user moves through steps.
- Keep the flow in draft mode so a refresh or “come back later” can resume from the last completed step instead of starting over.
- Decide whether Zustand (or similar) is worth it for that draft persistence, vs keeping a plain reducer plus local/session storage.
