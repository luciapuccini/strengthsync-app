# 010 — Enforce 18+ minimum age in onboarding

## Parent PRD

`docs/mvp.md` §7 (Privacy policy and terms)

## What to build

The terms of service (owned by the `strengthsync` repository) set the minimum
age at 18. This repo's onboarding schemas accept 13:

- `client/src/lib/onboarding-schema.ts:54` — `age: z.number().int().min(13).max(100)`
- `server/src/domain/onboarding/schema.ts:68` — same, kept in step per the
  file's own convention comment

A prior review flagged this as something only the other repo could fix
("nothing in this repo can fix that; it needs an issue over there, or the
terms are aspirational"). That's wrong: 18+ is the mandatory rule, not the
terms. This repo is the one out of line with it, and the fix is here —
raise both `min()` calls to 18. Client and server must move together, same
as any other change to these mirrored schemas.

**HITL:** none — this is a same-repo one-line-times-two fix once picked up,
no external dependency.

## Acceptance criteria

- [ ] `PersonalStepSchema.age` in `client/src/lib/onboarding-schema.ts` is
      `min(18)`
- [ ] The matching field in `server/src/domain/onboarding/schema.ts` is
      `min(18)`
- [ ] A user entering age 13–17 during onboarding is rejected client-side
      before submit and server-side if bypassed

## PRD sections addressed

- Scope item 7 (Privacy policy and terms) — the terms' age floor has to
  actually be enforced, not just published

## STATUS

TODO
