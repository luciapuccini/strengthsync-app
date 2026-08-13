## Status

DONE — commit ee3262a

## Parent PRD

`issues/auth/prd.md`

## What to build

Bring the written record in line with what the code now does. Several documents
currently describe the shared coach credential as the product's access mechanism,
which stops being true partway through this phase.

- The stack documentation's access decision is rewritten: client accounts with
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

- [x] No document describes HTTP Basic authentication as the current access mechanism. — verified by re-scanning `docs/`, `README.md`, `NOTES.md` and `.github/` for *basic auth*, *basic credential*, *BASIC_AUTH*, *shared coach credential*. The surviving matches are all explicitly historical: `stack.md` naming the decision it replaced, and the body of the remember-device note, which now opens with a superseded banner. Not separately tested: no test reads prose.
- [x] The stack documentation records client accounts and session cookies as the decision, and notes that the pre-existing warning about client-facing accounts is now addressed. — the decisions-table row and the rewritten access section; the warning is quoted back and marked addressed, with roles, invitations, password reset, email verification and social sign-in listed as still absent so "addressed" cannot be read as "finished". Every claim in it was checked against `password.ts`, `session-token.ts`, `session.ts`, `schema.ts` and `app.ts` rather than written from memory.
- [x] The contract documentation's authentication section, operation count and route shape match the regenerated contract. — count and shape taken by enumerating `server/openapi.json` (14 operations, `sessionCookie` scheme), not counted by hand. Not separately tested — but `pnpm check:openapi` would be exactly the test, if it existed; see the standing defect below.
- [x] The readme's authentication row, secrets table and getting-started section are accurate against a clean checkout. — the secrets row now names `SESSION_JWT_SECRET`, matching `server/.dev.vars.example`; the seed and migrate scripts were checked to exist in `server/package.json`; `turbo` is a root devDependency with a `dev` task in `turbo.json`. The demo credential added to getting-started is the one `app.auth.test.ts` signs in with against the real seed files, so that row is covered by a test in the gate.
- [x] The remember-device note is marked superseded, with what was adopted and what diverged. — frontmatter overview and todo statuses updated, plus a banner listing six adopted decisions and five divergences, and a warning that the file paths below it are from the original proposal and several no longer exist.
- [x] The scratch note about the contract-check script is corrected, and the missing script remains recorded as a known defect for separate work. — **corrected locally only.** `NOTES.md` is gitignored (`.gitignore:19`), so the correction is on disk but cannot be committed and no reviewer will see it. The durable record is the PRD's own entry, which now says the script is missing rather than unnecessary and why 015 deliberately did not write it.
- [x] Following the readme from a clean checkout produces a running app in which a new account can be registered. — **not end-to-end verified.** Every command in the readme was checked to exist and resolve, and a `pn turbo dev` typo that would have stopped a clean checkout at the last step was fixed. Registration itself is covered by `app.auth.test.ts` against the same seed files a clean checkout applies. What was not done is an actual clean clone, install, migrate, seed and browser registration — see Notes.
- [x] `POST /wf/complete-week` no longer declares a 401 it cannot return, and the contract is regenerated. — the response is dropped from `routes/wf/endpoints.ts` and both artifacts regenerated. Diffed by script against a snapshot: exactly one operation changed, none added or removed, no component schema touched. `app.public.test.ts`'s workflow-trigger tests, which call the route with no cookie, still pass.
- [x] The parent PRD's "Found while implementing this phase" list is worked through: each entry is either fixed, or restated as a standing known defect with its reason. — see Notes for the disposition of all nine entries.
- [x] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`. — 98 server + 81 client tests.

## Notes

- **Every entry in the PRD's "Further Notes", and where it landed:**
  - `getProfile` throwing where a route declared 404 — resolved in 013.
  - `getPlan` reading the active plan behind a `{planId}` path — resolved in 013.
  - The demo seed's expired in-flight week — resolved by anchoring the seeds to `date('now', …)`.
  - `POST /wf/complete-week`'s undeliverable 401 — **resolved here.**
  - The remember-device note being superseded — **resolved here.**
  - `db:generate` broken by the config's relative paths — **found already resolved** in commit `83416d0`, which this sweep marked rather than leaving as an open entry describing fixed code.
  - The missing `check:openapi` script — **restated as a standing defect.** Not written here: it is a CI change with its own verification, and this issue's own scope says the defect stays recorded for separate work.
  - The consumerless plan-by-identifier route — **restated as a standing defect**, and recorded in `api_contracts.md` under "Endpoints current state" so the audit that eventually cuts it has one place to look. Cutting a route is a contract change, not a documentation one.
  - The browser resource caches surviving sign-out — **restated as a standing defect**, with the reason it is not fixed here spelled out. It is the one live data leak on the list and the first thing to pick up after this phase.
- **One document outside this issue's list was corrected.** `docs/future_state_after_mvp/stats.md` proposed `GET /api/clients/:clientId/exercise-progress` — the exact route shape 013 deleted. Left alone, the next author to build it would have reintroduced what this phase removed. Retargeted at `/api/me/`, with a banner explaining why; nothing else in that design changes, because its scoping was always "one athlete's records" and the session now supplies what the URL used to.
- **The readme's user flows were wrong in a way the issue did not list.** They told the reader to open **Clients**, create or pick an athlete, and that one shared coach login covers the caseload. That screen was deleted in this phase. Rewritten as sign-up and sign-in.
- **What "accurate against a clean checkout" was and was not checked against.** Each command was verified to exist and resolve — the seed and migrate scripts in `server/package.json`, `turbo` as a root devDependency with a `dev` task, `SESSION_JWT_SECRET` in `.dev.vars.example`. No actual clean clone was run. A registration needs only the signing secret, not `OPENAI_API_KEY`, so the documented path should work; that reasoning is what the criterion rests on, not an observed run.

## Blocked by

- Blocked by `issues/auth/013-delete-legacy-routes.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 26
- User story 30
- User story 31
