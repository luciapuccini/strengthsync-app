# Expand the OpenAPI spec to cover the full public API

**STATUS: TODO**

## Parent PRD

`issues/prd-monorepo-simplification.md` — see Solution, User stories 1 and 9, and Implementation Decisions: "Spec-first contract".

## What to build

Grow `packages/api-contract/openapi.json` from its current single route (`POST /wf/complete-week`) into a complete description of the public HTTP boundary, transcribed from `docs/architecture/api_contracts.md`. This is a contract-authoring slice: no application code changes behavior, and nothing consumes the new paths yet (the client migration is `issues/010-migrate-ui-to-openapi-fetch.md`). The deliverable is a spec the next slice can generate a fully typed client from, plus a drift check that keeps the generated file honest.

Paths to add (source of truth: `docs/architecture/api_contracts.md`; the existing `/wf/complete-week` entry stays as-is):

- `GET /health` → `200 { ok: boolean }` (unauthenticated)
- `GET /api/clients` → `200 { clients: Client[] }`
- `POST /api/clients` → body `CreateClientInput`, `201 { client: Client }`
- `GET /api/clients/{clientId}` → `200 { client: Client }`
- `GET /api/clients/{clientId}/profile` → `200 { profile: ClientProfile }`
- `PUT /api/clients/{clientId}/profile` → body `UpdateClientProfile`, `200 { profile: ClientProfile }`
- `GET /api/clients/{clientId}/plans` → `200 { plans: Plan[] }`
- `GET /api/clients/{clientId}/plans/active` → `200 { plan: Plan }`
- `GET /api/clients/{clientId}/plans/{planId}` → `200 { plan: Plan }`
- `GET /api/clients/{clientId}/weeks/current` → `200 { week: Week }`
- `GET /api/clients/{clientId}/weeks` with query params `status` (optional, `completed` etc. per `WeekStatus`) and `planId` (optional) → `200 { weeks: Week[] }`
- `GET /api/clients/{clientId}/weeks/{weekId}` → `200 { week: Week }`
- `POST /api/clients/{clientId}/weeks/{weekId}/days/{dayIndex}/save` → body `SaveDayLog`, `200 { week: Week }`
- `PATCH /api/clients/{clientId}/weeks/{weekId}/days/{dayIndex}` → body `UpdateDayLog`, `200 { week: Week }`

Component schemas to define (mirror the Zod schemas in `services/domain/src/model/index.ts` and `services/domain/src/contracts/index.ts` field-for-field, including `additionalProperties: false` where the Zod schema is a strict object, `nullable` where Zod allows null, and enums for the string unions):

- Entity schemas: `Coach` (only if referenced; otherwise omit), `Client`, `ClientProfile`, `Plan`, `Week`
- Value schemas/enums: `DayType`, `ClientStatus`, `PlanStatus`, `WeekStatus`, `ExerciseFeedback`, `PlanDay`, `PlannedExercise`, `WeekDay`, `ExerciseLog`, `PerformedSet`, plus the recursive JSON value/record shapes used by `ClientProfile` fields (`goals`, `body_composition`, `strength_loads`, `nutrition`, `swimming`, `schedule_preferences`)
- Input schemas: `CreateClientInput`, `UpdateClientProfile` (ClientProfile minus `id`, `client_id`, `updated_at`), `SaveDayLog`, `UpdateDayLog` (including the documented rule that a skipped exercise has empty sets — encode as description text; OpenAPI cannot express the superRefine)
- `ApiError` (`{ error: { code, message } }`) and wire it as the error response (`400`/`401`/`404`) on the routes that document those codes per `api_contracts.md`
- Keep the existing `CompleteWeekInput` / `CompleteWeekStarted` components unchanged

Path parameters `clientId`, `planId`, `weekId` are UUID strings; `dayIndex` is an integer 1–7. All `/api/*` and `/wf/*` routes document HTTP Basic auth via a `securitySchemes` entry (`basicAuth`); `/health` is explicitly unauthenticated.

Drift check:

- Add a script (e.g. `packages/api-contract` script `check:openapi` or a root `scripts/check-openapi-drift.mjs`) that runs the generator into a temp file and fails if it differs from the committed `openapi.d.ts`
- Wire it into CI (`.github/workflows/`) alongside the existing root checks, so a spec edit without regeneration fails the build

Authoring rules:

- Do not change any route behavior "to match the spec" — where the spec and an implementation detail disagree, transcribe what `docs/architecture/api_contracts.md` documents and flag the discrepancy in the issue notes for the implementer of `issues/010-migrate-ui-to-openapi-fetch.md`
- `info.title`/`version` may be generalized (the doc no longer describes only CF Workflows)
- The generated `openapi.d.ts` is committed (checked in, regenerated via `gen:openapi`)

## Acceptance criteria

- [ ] Every route listed above appears in `openapi.json` with request body, path/query params, success response, and documented error responses matching `docs/architecture/api_contracts.md`
- [ ] All component schemas exist and typecheck; a spot-check type test (or a scratch type assertion in the package) confirms `components["schemas"]["Week"]` is assignable from the shape the UI uses today (same field names, nullability, and enums as `services/domain` `WeekSchema`)
- [ ] `pnpm --filter @strengthsync/api-contract gen:openapi` regenerates the committed `openapi.d.ts` with no diff (reproducible generation)
- [ ] The drift check fails when `openapi.json` is edited without regenerating, and passes otherwise; it runs in CI
- [ ] `docs/architecture/api_contracts.md` gains a one-line pointer that `packages/api-contract/openapi.json` is now the machine-readable source of truth (full doc rewrite is `issues/014-update-docs-two-service-monolith.md`)
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass; no app code changed behavior

## Blocked by

- Blocked by `issues/008-create-api-contract-package.md`

## User stories addressed

- User story 1
- User story 2 (full `paths`/`components` coverage)
- User story 9
