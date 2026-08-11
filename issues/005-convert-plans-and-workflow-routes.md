# Convert plans + workflow routes, delete the manual validators and domain/contracts

**STATUS: DONE**

## Parent PRD

`issues/prd-zod-first-api-contract.md` — see Implementation Decisions: "Layering" and "Manual
validation helpers are removed as a consequence, not as a precursor".

## What to build

The last two areas convert, and with no caller left the hand-written validation helpers and the
mixed contracts folder both come out. This is the largest slice; the route conversion is the small
half and the layering cleanup is the real work.

### Route conversion

New — `server/src/routes/plans/{endpoints.ts,schemas.ts}`: the two surviving plan reads (active
plan, plan by id). Deleted: `server/src/routes/plans.ts`.

New — `server/src/routes/wf/{endpoints.ts,schemas.ts}`: `/complete-week`. Note this endpoint has
**no validation at all** today — `routes/cf-api.ts:9` does `await req.json<{ clientId: string }>()`,
which is a bare cast, so a request with a missing or non-string `clientId` currently reaches the
workflow binding. It gains a real `CompleteWeekInput` schema (`clientId` as a uuid) and now returns
400 on a malformed body. Deleted: `server/src/routes/cf-api.ts`. Keep the `Hono<{ Bindings: Env }>`
typing — this area needs the Worker bindings, unlike the others.

### Delete the manual validators

`server/src/lib/validate.ts` goes entirely: `parseBody`, `parseUuidParam`, and `isResponse`. Every
`const x = parseX(...); if (isResponse(x)) return x` pair should already be gone from the converted
areas; this slice removes the last of them and the file. `lib/lookup.ts` (`requireClient`) stays —
it is a 404-on-missing-record lookup, not validation.

### Delete domain/contracts (the layering work)

The folder splits three ways. Before any of it can move, the persistence layer has to stop importing
HTTP DTO types — the existing boundary rule at `eslint.config.js:100-104` forbids `db/**` from
importing `routes/**`, so moving the DTOs while the repositories depend on them would break the lint
gate. Decouple first, then move.

| Symbol | Today | Destination |
| --- | --- | --- |
| `CreateClientInputSchema`, `UpdateClientProfileSchema` | `domain/contracts` | `routes/clients/schemas.ts` |
| `SaveDayLogSchema`, `UpdateDayLogSchema`, `DayExerciseLogSchema` | `domain/contracts` | `routes/weeks/schemas.ts` |

> **These three must be *defined* in `routes/weeks/schemas.ts`, not rebuilt from the existing ones.**
> Slice 004 established that in Zod 4 `.superRefine()` returns a ZodObject that still exposes
> `.shape`, so the `z.object(Existing.shape)` technique used elsewhere compiles and runs while
> silently dropping the cross-field rule. Define them with the `z` from `@hono/zod-openapi` and give
> them their `.openapi('SaveDayLog')` / `.openapi('UpdateDayLog')` / `.openapi('DayExerciseLog')`
> names — slice 004 deliberately left them unnamed, so slice 006 depends on this being done here.
| `ApiError` | `domain/contracts` | `routes/` shared spot — see note below |
| `GeneratedPlanInputSchema`, `ActivateGeneratedPlanCommandSchema` | `domain/contracts` | new `workflows/contracts.ts` |

Repository decoupling — each of these currently imports an HTTP DTO type and must derive from
`domain/model` or the new workflow contracts instead:

- `db/repositories/clients.ts:3` — `CreateClientInput` → `Pick<Client, 'display_name'>`
- `db/repositories/profiles.ts:3` — `UpdateClientProfile` → `ClientProfileSchema.omit({ id: true, client_id: true, updated_at: true })`, exported from `domain/model`
- `db/repositories/weeks.ts:3` — `SaveDayLog`, `UpdateDayLog` → day-log write shapes derived from `domain/model`
- `db/repositories/plans.ts:3` — `ActivateGeneratedPlanCommand` → import from `workflows/contracts.ts`

Also repoint: `workflows/plan-turnover.ts:10` at the new workflow contracts module.

**`ApiError` needs a decision.** `lib/errors.ts:4` imports it, and `lib/` sits below the routes in
the layering. Options: keep the type in a neutral module that both `lib/` and the route schemas can
import, or move `errorResponse`/`repoErrorResponse` up into the routes layer with it. Pick one
deliberately and note it in the commit message — do not create a `lib/` → `routes/` import without
deciding it is correct.

### Preserve the existing schema coverage

`domain/contracts/contracts.test.ts` is deleted along with its folder. Its assertions — in
particular the cross-field rule that a skipped exercise carries no performed sets — move next to
the schemas that moved, so the coverage lands in the route areas rather than disappearing.

Explicitly NOT in this slice: generating the document (slice 006) or regenerating client types
(slice 007). `server/openapi.json` stays hand-written and authoritative through this slice.

## Acceptance criteria

- [x] `server/src/routes/` contains only the four area folders — plus `shared.ts`, see below
- [x] `server/src/lib/validate.ts` is deleted and nothing imports `parseBody`, `parseUuidParam`, or `isResponse`
- [x] `server/src/domain/contracts/` is deleted entirely
- [x] `grep -rn "domain/contracts" server/src/` returns nothing
- [x] No file under `server/src/db/` imports from `server/src/routes/` — the eslint boundary passes unchanged
- [x] `POST /wf/complete-week` with a missing or non-uuid `clientId` returns 400; with a valid body it still starts a workflow instance and returns the instance id — both pinned by tests against a stub binding
- [x] The skipped-exercise-with-sets assertion still exists, relocated to `routes/weeks/schemas.test.ts`
- [x] The `ApiError` placement decision is recorded in the commit message
- [x] `app.public.test.ts` passes with no relaxed assertions
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass from the root (53 server + 37 client)
- [x] `pnpm --filter @strengthsync/server build` still succeeds

### Notes from implementation

**Deviation — workflow contracts went to `domain/workflow.ts`, not `workflows/contracts.ts`.** The
issue's plan would not have linted: `eslint.config.js:100-104` forbids `db/**` from importing
`**/workflows/**`, and `db/repositories/plans.ts` consumes `ActivateGeneratedPlanCommand`. Placing
them under `domain/` satisfies the boundary and still achieves user story 13 — they are no longer
mixed with HTTP DTOs. The module says why, so nobody "fixes" the location later.

**`ApiError` decision: the type is defined in `lib/errors.ts`,** the module that actually builds the
bodies, and `routes/shared.ts` carries the Zod `ApiErrorSchema` that documents the same shape. No
`lib/` → `routes/` import was created and no third module was invented. The two are different
artifacts — one emits, one documents — so the small overlap is deliberate.

**New `routes/shared.ts`.** Slice 004 had the weeks area importing `ApiErrorSchema` from
`routes/clients/schemas.ts`, a cross-area dependency that would only get worse with four areas.
`shared.ts` now holds `ApiErrorSchema`, the `json()` response helper, the three standard error
responses, and `uuidParam()` / `ClientIdParamSchema`.

**`lib/lookup.ts` was deleted, not kept.** The issue expected `requireClient` to survive, but the
typed-response constraint from slice 003 means handlers cannot return a pre-built `Response`, so
every area now builds its `client_not_found` 404 inline. Nothing imported the module any more.
Behaviour is unchanged and still pinned by slice 002's `client_not_found` test.

**Repository decoupling used domain write shapes.** `domain/model` gained `ClientProfileWriteSchema`,
`DayExerciseLogSchema`, and `DayLogPatchSchema`/`DayLogSave` — the vocabulary of a write, as opposed
to the HTTP body that carries it. The route schemas declare their own field lists and are kept
honest by assignment: passing a parsed body to a repository is what typechecks the two into
agreement.

**Pre-existing, not fixed:** `docs/architecture/api_contracts.md:11` says `/wf/*` is protected by the
shared Basic credential, but `app.ts` applies `basicAuth` to `/api/*` only. Unchanged by this slice —
flagged for the documentation pass in slice 008, which should either correct the doc or the code.

## Blocked by

`issues/004-convert-weeks-area.md` — `lib/validate.ts` cannot be deleted while the weeks area
still calls it, and the weeks DTOs cannot move until that area's schema file exists.

## User stories addressed

- User story 10 (schemas beside their endpoints)
- User story 11 (entity vocabulary stays central)
- User story 12 (persistence stops depending on HTTP shapes)
- User story 13 (workflow contracts separated from HTTP contracts)
- User story 15 (workflow trigger validated like everything else)
- User story 9 (validation declared with the route)
