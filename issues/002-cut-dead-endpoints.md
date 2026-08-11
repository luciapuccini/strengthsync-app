# Cut the three endpoints with no caller

**STATUS: TODO**

## Parent PRD

`issues/prd-zod-first-api-contract.md` — see Implementation Decisions: "Endpoint reduction first".

## What to build

Delete three read endpoints that nothing calls, so they are never ported to the new route style.
This is the audit in `docs/architecture/api_contracts.md:36-40`, now confirmed against the
client's real surface — `client/src/api/client.ts` exports ten functions and none of them hit
these paths:

| Endpoint | Handler | Evidence |
| --- | --- | --- |
| `GET /api/clients/{clientId}` | `server/src/routes/clients.ts:31` | no client caller; one HTTP test |
| `GET /api/clients/{clientId}/plans` | `server/src/routes/plans.ts:18` | no client caller, no HTTP test |
| `GET /api/clients/{clientId}/weeks/{weekId}` | `server/src/routes/weeks.ts:60` | no client caller, no HTTP test |

Work:

- Remove the three handlers.
- Hand-edit `server/openapi.json`: remove the three path items, plus any response component
  they orphan. Check each candidate before deleting it — `ClientResponse` is still used by
  `POST /api/clients`, so only components with zero remaining references go.
- Re-run `pnpm gen:openapi` and commit the regenerated `client/src/api/openapi.d.ts`.
- If any alias in `client/src/api/types.ts` refers to a component that was removed, delete that
  alias too; confirm nothing imported it.

Test changes in `server/src/app.public.test.ts`:

- `'creates, lists, and fetches a client'` — drop the trailing fetch-by-id assertion; keep the
  create and list assertions and rename the test to match what it now covers.
- `'returns 404 for an unknown client and 400 for a malformed uuid'` — this one is valuable and
  must survive. Retarget it at `/api/clients/{clientId}/profile`, which takes the same path
  parameter and still returns 404 for an unknown client and 400 with `invalid_id` for a
  malformed one.

**Keep the repository functions.** `getClient` still backs `lib/lookup.ts:14`, and `listPlans`
and `getWeek` keep their direct coverage in `db/repositories/repositories.test.ts`. This slice
removes HTTP surface, not persistence capability.

Explicitly NOT in this slice: adding `@hono/zod-openapi`, moving schemas, or touching validation.

## Acceptance criteria

- [ ] The three handlers are gone from `routes/clients.ts`, `routes/plans.ts`, `routes/weeks.ts`
- [ ] `server/openapi.json` describes 12 operations and no orphaned component schemas remain
- [ ] `pnpm check:openapi` passes and the regenerated client types are committed
- [ ] The malformed-uuid → 400 `invalid_id` assertion still exists, retargeted at the profile route
- [ ] The unknown-client → 404 assertion still exists
- [ ] `getClient`, `listPlans`, and `getWeek` still exist in the repositories and keep their unit coverage
- [ ] Requesting any of the three removed paths returns 404 from the router
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass from the root
- [ ] `docs/architecture/api_contracts.md` "Endpoints current state" table is updated — the three cut candidates are recorded as cut, not still pending

## Blocked by

`issues/001-move-openapi-spec-into-server.md` — the spec must already live in `server/` and the
root `gen:openapi` script must exist before editing the document here.

## User stories addressed

- User story 14 (remove dead endpoints before porting them)
- User story 21 (docs reflect reality)
