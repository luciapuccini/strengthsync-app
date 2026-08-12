## Parent PRD

`issues/auth/prd.md`

## What to build

Bring the written record in line with what the code now does. Several documents
currently describe the shared coach credential as the product's access mechanism,
which stops being true partway through this phase.

- The stack documentation's access decision is rewritten: athlete accounts with
  hashed passwords and signed session cookies replace the shared Basic credential.
  Its warning that the Basic scheme "is not user identity" and must be replaced
  before exposing client-facing accounts is now satisfied and should be recorded as
  such.
- The contract documentation's authentication section, operation count and route
  shape are updated for the session-addressed API, and its description of the
  production-only enforcement is removed.
- The readme's authentication row, secrets table and getting-started section are
  updated: the signing secret replaces the Basic credential variables, and seeding
  is one command plus a documented manual production step.
- The remember-device design note is marked superseded, recording what this phase
  took from it — cookie shape, lifetime, middleware location — and where it
  diverged, by carrying identity in the payload and retiring Basic rather than
  layering on it.
- The scratch note guessing that the contract-check script "may be unnecessary" is
  corrected: the script is missing, not unnecessary, and the pipeline still calls
  it. The known defect stays recorded for separate work.

See the "Seeds, scripts and documentation" section of the parent PRD and its
"Further Notes".

## Acceptance criteria

- [ ] No document describes HTTP Basic authentication as the current access mechanism.
- [ ] The stack documentation records athlete accounts and session cookies as the decision, and notes that the pre-existing warning about client-facing accounts is now addressed.
- [ ] The contract documentation's authentication section, operation count and route shape match the regenerated contract.
- [ ] The readme's authentication row, secrets table and getting-started section are accurate against a clean checkout.
- [ ] The remember-device note is marked superseded, with what was adopted and what diverged.
- [ ] The scratch note about the contract-check script is corrected, and the missing script remains recorded as a known defect for separate work.
- [ ] Following the readme from a clean checkout produces a running app in which a new account can be registered.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/auth/013-delete-legacy-routes.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 26
- User story 30
- User story 31
