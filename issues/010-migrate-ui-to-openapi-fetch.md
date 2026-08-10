# Migrate the UI to openapi-fetch and drop the @strengthsync/domain dependency

**STATUS: TODO**

## Parent PRD

`issues/prd-monorepo-simplification.md` — see Implementation Decisions: "Client consumes only the contract" and User stories 3, 4, 12, 13.

## What to build

Rewire the UI's entire API layer onto `openapi-fetch` against the generated `paths` type, and remove the UI's dependency on `@strengthsync/domain` completely. After this slice the client package imports nothing from `services/domain` — all wire types come from `@strengthsync/api-contract` — which unblocks moving the domain package into the server (`issues/011-move-domain-into-api-app.md`). Product behavior must be identical: same requests, same error surfacing, same optimistic-update flow, same empty states (user story 12).

### New API layer shape

- One client factory: `apps/ui/src/api/client.ts` becomes the `openapi-fetch` instance (`createClient<paths>({ baseUrl, ... })`) — the current `apps/ui/src/api/cf-api/workflows-api.ts` pattern, generalized. Keep Basic-auth header injection exactly as the current hand-rolled client does it (check how credentials are attached today and preserve the mechanism; do not change the auth posture).
- Thin typed wrappers per resource replacing the hand-rolled fetch modules:
  - `apps/ui/src/api/clients.ts` — list/create/get client, get/put profile (replaces the client/profile parts of the current `api/client.ts`)
  - `apps/ui/src/api/plans.ts` — list plans, get active plan, get plan by id
  - `apps/ui/src/api/weeks.ts` — current week, weeks list (status/planId query), week by id, save day (`POST .../save`), patch day (`PATCH .../days/{dayIndex}`) (absorbs `api/weekResource.ts`, `api/dayLog.ts`)
  - `apps/ui/src/api/history.ts` — history derivation inputs if any remain (absorbs `api/historyResource.ts`)
  - `apps/ui/src/api/workflows.ts` — complete-week trigger (absorbs `api/cf-api/workflows-api.ts` and `api/cf-api/complete-week.ts`; delete the now-empty `cf-api/` directory)
- Keep `apps/ui/src/api/errors.ts` semantics: the UI still maps API error bodies to its error representation, now typed from `components["schemas"]["ApiError"]` instead of `@strengthsync/domain/contracts`.

### Type replacements

Replace every `@strengthsync/domain` import in `apps/ui/src` with contract types:

- `Client`, `ClientProfile`, `Plan`, `Week`, `WeekDay`, `ExerciseLog`, `ExerciseFeedback`, `DayType` etc. → `components["schemas"]["..."]` from `@strengthsync/api-contract`
- `SaveDayLog`, `UpdateDayLog`, `CreateClientInput`, `UpdateClientProfile`, `ApiError` → corresponding `components["schemas"][...]` types
- Known call sites include (grep to confirm the full list): `api/client.ts`, `api/client.test.ts`, `api/dayLog.ts`, `api/weekResource.ts`, `api/historyResource.ts`, `api/errors.ts`, `store/weekDraftStorage.ts`, `store/slices/trackerSlice.ts` (+ test), `reducers/weekReducer.ts`, `reducers/utils/weekUtils.ts`, `routes/history/toWeekHistory.ts` (+ test), `routes/clients-page/**`, `routes/tracker-page/**`, `test/weekFixture.ts`

### Runtime validation decision (sensitive — implement exactly this)

- **Drop runtime Zod validation of API responses** in the UI: the server validates inbound bodies and owns response shapes; `openapi-fetch` types are the client-side contract. Remove the `ClientSchema`/`ClientProfileSchema`/`PlanSchema`/`WeekSchema` response parsing from the old `api/client.ts` (the module is being rewritten anyway).
- **Keep safe localStorage draft handling** (user story 13): `store/weekDraftStorage.ts` currently parses drafts with `WeekSchema` from domain. Replace it with a small UI-owned Zod schema (e.g. `apps/ui/src/lib/week-draft-schema.ts`) that validates the draft shape defensively. It does not need to be field-perfect with the wire `Week` — it must reject corrupt/garbage drafts and accept drafts the UI itself writes. Add a comment that this schema is UI-local state validation, deliberately not the wire contract.
- `routes/history/toWeekHistory.ts` uses `DayTypeSchema` at runtime — replace with a local constant/enum check or a type-only usage plus a literal array if runtime membership is actually needed (prefer the smallest change that keeps behavior).
- `api/dayLog.ts` validates outgoing `SaveDayLog` bodies with `SaveDayLogSchema` before sending — drop this (the server returns 400 on invalid bodies and the UI error mapping already handles it), unless a call site depends on the client-side throw for UX; if so, keep a minimal local check and note it in the PR.

### Tests

- Rewrite `api/client.test.ts` against the new wrapper modules: keep coverage of request shapes (method/path/body), auth header attachment, and error mapping; remove assertions that malformed responses are rejected client-side
- Keep `store/slices/trackerSlice.test.ts`, `routes/history/toWeekHistory.test.ts`, `test/weekFixture.ts` green with contract types (fixtures must satisfy `components["schemas"]["Week"]` etc.)
- Add/adjust `weekDraftStorage` tests so corrupt drafts are still ignored

### Cleanup

- Remove `@strengthsync/domain` from `apps/ui/package.json` dependencies
- Remove the `../../services/domain` project reference from `apps/ui/tsconfig.json`
- Remove `zod` from `apps/ui/package.json` only if no UI file still imports it after the above (the draft schema likely keeps it — check, don't assume)
- Update the `apps/ui` boundary rule in `eslint.config.js`: allowed workspaces become `['@strengthsync/api-contract']` (domain no longer allowed)

## Acceptance criteria

- [ ] `grep -r "@strengthsync/domain" apps/ui/src apps/ui/package.json apps/ui/tsconfig.json` returns nothing
- [ ] Every API call in the UI goes through the `openapi-fetch` client; no hand-written `fetch(` against the API remains in `apps/ui/src/api/`
- [ ] `apps/ui/src/api/cf-api/` is deleted; complete-week uses the same client as everything else
- [ ] Auth header injection behavior is unchanged (verified by existing/rewritten client tests)
- [ ] Corrupt localStorage drafts are still ignored without crashing (test coverage exists)
- [ ] eslint `apps/ui` boundary allows only `@strengthsync/api-contract` among `@strengthsync/*` packages
- [ ] `pnpm --filter @strengthsync/ui lint`, `typecheck`, `test`, and `build` all pass
- [ ] Full root `pnpm lint`, `pnpm typecheck`, `pnpm test` pass; `pnpm --filter @strengthsync/api build` (dry-run deploy) still succeeds
- [ ] Manual smoke: tracker page loads current week, save day works, history renders, complete-week triggers — against `wrangler dev` (behavior parity, user story 12)

## Blocked by

- Blocked by `issues/009-expand-openapi-spec-to-full-public-api.md`

## User stories addressed

- User story 3
- User story 4
- User story 12
- User story 13
