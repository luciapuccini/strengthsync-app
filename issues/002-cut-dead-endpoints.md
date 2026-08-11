# Cut the three endpoints with no caller

**STATUS: DONE**

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

- [x] The three handlers are gone from `routes/clients.ts`, `routes/plans.ts`, `routes/weeks.ts`
- [x] `server/openapi.json` describes 12 operations and no orphaned component schemas remain
- [x] `pnpm check:openapi` passes and the regenerated client types are committed
- [x] The malformed-uuid → 400 `invalid_id` assertion still exists, retargeted at the profile route
- [x] The unknown-client → 404 assertion still exists — see the deviation note below
- [x] `getClient`, `listPlans`, and `getWeek` still exist in the repositories and keep their coverage
- [x] Requesting any of the three removed paths returns 404 from the router — pinned by a new test
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass from the root (45 server + 37 client)
- [x] `docs/architecture/api_contracts.md` "Endpoints current state" table is updated — the three cut candidates are recorded as cut, not still pending

### Notes from implementation

**Deviation — the unknown-client assertion did not move to the profile route.** The issue proposed
retargeting both halves of `'returns 404 for an unknown client and 400 for a malformed uuid'` at
`GET .../profile`. The malformed-uuid half did move there. The unknown-client half did not: the
deleted route was the *only* HTTP-level exercise of `requireClient`'s `client_not_found` path, and
`GET .../profile` does not call `requireClient` — it 404s with `profile_not_found` when the profile
row is absent, which would have passed the status assertion while silently dropping the coverage.
That half now targets `GET .../weeks`, which does call `requireClient`, and asserts the
`client_not_found` code explicitly. One test became two, each named for what it actually pins.

**Scope call — `Coach` was removed from the document too.** It was already an orphan before this
slice (no operation referenced it), so it is not one of the three cuts. It was removed anyway,
because the acceptance criterion above asks for no orphaned schemas and because in slice 006 the
generated document will only contain schemas some route registers — `Coach` would vanish on its own
there and break `client/src/api/types.ts` at the least convenient moment. Its client alias was
unused; removing it changed nothing. `CoachSchema` in `domain/model` is untouched: coach is still a
real record, just not part of the HTTP surface.

**Correction to this issue's text.** It claimed `getWeek` keeps "direct coverage in
`repositories.test.ts`". It does not appear there. It is still load-bearing — `updateDayLog` calls
it internally and `db/testing/index.ts` uses it — so keeping it is right, but the stated reason was
wrong.

## Blocked by

`issues/001-move-openapi-spec-into-server.md` — the spec must already live in `server/` and the
root `gen:openapi` script must exist before editing the document here.

## User stories addressed

- User story 14 (remove dead endpoints before porting them)
- User story 21 (docs reflect reality)
