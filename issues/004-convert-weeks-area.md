# Convert the weeks area to declarative routes

**STATUS: TODO**

## Parent PRD

`issues/prd-zod-first-api-contract.md` — see Implementation Decisions: "Parameter coercion".

## What to build

Convert the largest and trickiest route area. `server/src/routes/weeks.ts` is 108 lines and,
after slice 002, holds four routes: current week, week list, day save, and day patch. It is the
only area with query parameters and the only one with a non-string path parameter, so it exercises
parts of the toolchain the clients area did not.

New — `server/src/routes/weeks/`:

- `schemas.ts` — param schemas, the query filter, request DTOs (`SaveDayLog`, `UpdateDayLog`,
  still sourced from `domain/contracts` until slice 005), the `{ week }` and `{ weeks }` response
  envelopes, and `.openapi(...)` component registrations
- `endpoints.ts` — the four routes as `createRoute` definitions plus handlers

Deleted: `server/src/routes/weeks.ts` (including the local `parseWeekFilter` helper, :13).

The two conversions that need care:

**The `dayIndex` path parameter.** Today it is `Number(c.req.param('dayIndex'))` followed by a
manual integer-and-range check that returns 400 `invalid_input` (`weeks.ts:73-76`, repeated at
:90-93). Declaratively this is `z.coerce.number().int().min(1).max(7)`. Note the code change this
implies: the failure now arrives through the `param` target, which slice 003's mapper turns into
`invalid_id`, not `invalid_input`. **Decide explicitly** — either special-case the mapper so a
non-uuid-shaped param keeps `invalid_input`, or accept the code change and update the assertion.
Do not let it change by accident; there is a test that pins the 400 but not currently its code.

**The `status` query filter.** Today `parseWeekFilter` rejects an unknown status with 400 and a
message listing the valid options (`weeks.ts:20-27`). Declaratively it is an optional
`WeekStatusSchema` on the query, failing through the `query` target as `invalid_input`. The test
`'rejects an invalid week status filter with 400'` pins the status code and must stay green. The
`planId` filter stays optional and unvalidated-as-uuid, matching today's behavior — do not tighten
it in this slice.

Both surviving day routes (`POST .../save` and `PATCH .../{dayIndex}`) keep their `superRefine`
rule that a skipped exercise carries no sets. That refinement runs at runtime as it does today;
it simply has no JSON Schema representation, which is expected and handled in slice 007.

Explicitly NOT in this slice: `plans`, `wf`, deleting `lib/validate.ts` (plans still uses it),
generating the document, moving `domain/contracts`.

## Acceptance criteria

- [ ] `server/src/routes/weeks/{endpoints.ts,schemas.ts}` exist; `server/src/routes/weeks.ts` is gone
- [ ] `parseWeekFilter` is gone; the status filter is declared as a query schema
- [ ] `dayIndex` is coerced and range-checked declaratively; `0`, `8`, and `abc` all still return 400
- [ ] The `dayIndex` error-code decision is made deliberately and recorded in the commit message
- [ ] `'rejects an invalid week status filter with 400'` passes unmodified
- [ ] `'rejects a day patch whose skipped exercise carries sets (400)'` passes unmodified
- [ ] `'saves a day via POST and always marks it completed'` passes unmodified
- [ ] `GET /api/clients/{clientId}/weeks?planId=…` still filters as before
- [ ] The weeks-area schemas carry `.openapi(...)` names matching the components in `server/openapi.json`
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass from the root
- [ ] `pnpm --filter @strengthsync/server build` still succeeds

## Blocked by

`issues/003-adopt-zod-openapi-clients-area.md` — the library, the `OpenAPIHono` app, and the
validation-error mapper must exist first.

## User stories addressed

- User story 9 (validation declared with the route)
- User story 10 (schemas beside their endpoints)
- User story 16 (error codes preserved)
- User story 24 (runtime refinements keep running)
