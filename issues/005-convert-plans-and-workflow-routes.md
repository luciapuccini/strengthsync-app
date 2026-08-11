# Convert plans + workflow routes, delete the manual validators and domain/contracts

**STATUS: TODO**

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

- [ ] `server/src/routes/` contains only the four area folders — no loose route files remain
- [ ] `server/src/lib/validate.ts` is deleted and nothing imports `parseBody`, `parseUuidParam`, or `isResponse`
- [ ] `server/src/domain/contracts/` is deleted entirely
- [ ] `grep -rn "domain/contracts" server/` returns nothing
- [ ] No file under `server/src/db/` imports from `server/src/routes/` — the eslint boundary passes unchanged
- [ ] `POST /wf/complete-week` with a missing or non-uuid `clientId` returns 400; with a valid body it still starts a workflow instance and returns the instance id
- [ ] The skipped-exercise-with-sets assertion still exists, relocated to the weeks area
- [ ] The `ApiError` placement decision is recorded in the commit message
- [ ] `app.public.test.ts` passes with no relaxed assertions
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass from the root
- [ ] `pnpm --filter @strengthsync/server build` still succeeds

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
