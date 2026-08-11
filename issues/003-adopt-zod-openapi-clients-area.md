# Adopt @hono/zod-openapi and convert the clients area

**STATUS: DONE**

## Parent PRD

`issues/prd-zod-first-api-contract.md` — see Implementation Decisions: "Toolchain", "Error
envelope is preserved exactly", "Component naming is preserved".

## ⚠️ Checkpoint — CLEARED

Walked through before implementation. Two decisions taken:

1. **UUID-aware mapping**, not purely target-based. A `param` failure is `invalid_id` only when the
   failing issue is a malformed UUID (Zod 4 reports `code: 'invalid_format'`, `format: 'uuid'`);
   everything else is `invalid_input`. This preserves today's codes exactly and closes slice 004's
   open question about `dayIndex`, which stays `invalid_input`.
2. **Malformed JSON keeps the error envelope.** Hono throws `HTTPException(400)` for an unparseable
   body *before* any validator runs, and its response is plain text. `app.ts`'s `onError` now maps a
   400 `HTTPException` into `{ error: { code, message } }` so `client/src/api/errors.ts` can still
   read it instead of degrading to `unexpected_error`.

Original checkpoint text follows.

**Stop and walk through the validation-error approach before writing code.** This slice replaces
hand-written validation with declarative validation, and the error envelope is the one thing that
must not move. Present the `defaultHook` design — how a Zod failure plus its target becomes a
status, an error code, and a message — and get agreement before implementing. See PRD user
story 22.

The specific thing to explain: today two different helpers produce two different error codes.
`parseUuidParam` (`lib/validate.ts:34`) produces `invalid_id` for a malformed path id, and
`parseBody` (`lib/validate.ts:14`) produces `invalid_input` for a bad body, with the failing
field path prefixed onto the message. With declarative validation there is one hook for all
targets, so the mapping from `result.target` (`'param' | 'json' | 'query' | …`) back to those
two codes is the whole design, and it is what keeps `app.public.test.ts` green.

## What to build

Introduce the library, convert the clients area to the new route style, and leave every other
area untouched and working.

Dependency:

- Add `@hono/zod-openapi` to `server/package.json`. Its peer deps (`zod ^4.0.0`, `hono >=4.10.0`)
  are already satisfied by the catalog (`zod` 4.4.3, `hono` 4.12.31) — do **not** add version
  literals for those, they stay `catalog:`.
- Note the mechanic: `.openapi('Name')` is added by extending Zod's prototype, so the route layer
  imports `z` from `@hono/zod-openapi` while `domain/model` keeps importing `zod` directly. Both
  resolve to one installed Zod instance, so the extension applies to schemas built either way.

New — `server/src/lib/validation-error.ts`:

- A pure function, extracted rather than inlined in the hook so it can be tested without HTTP:
  `(error: ZodError, target) → { status: 400; code: string; message: string }`
- `param` → `invalid_id`; everything else → `invalid_input`
- Message keeps the existing shape from `parseBody`: `` `${path.join('.')}: ${issue.message}` ``
  when there is a path, bare message otherwise
- Minimal unit test alongside it (see Testing below)

New — `server/src/routes/clients/`:

- `schemas.ts` — path param schemas, request DTOs (`CreateClientInput`, `UpdateClientProfile`
  for now still re-exported from `domain/contracts`; they physically move in slice 005),
  response envelopes (`{ client }`, `{ clients }`, `{ profile }`), the `ApiError` schema, and the
  `.openapi('Client')`-style component registrations
- `endpoints.ts` — the four surviving routes as `createRoute` definitions plus their handlers

Deleted: `server/src/routes/clients.ts`.

Edit — `server/src/app.ts`:

- `new Hono()` → `new OpenAPIHono({ defaultHook })`, wiring the hook to `validation-error.ts`
- Everything else stays: the `onError` handler, the unauthenticated `/health`, the production-only
  `basicAuth` on `/api/*`, and the four `app.route(...)` mounts

Component naming matters here: `client/src/api/types.ts` aliases twenty component schemas by name,
and the generated document must eventually register those same names. Register them as you convert
each area, so slice 006's cutover is uneventful.

Routes not yet converted stay plain `Hono` sub-apps and still mount and serve normally — they just
contribute nothing to the document, which is fine because the hand-written `server/openapi.json`
remains authoritative until slice 006.

Explicitly NOT in this slice: touching `weeks`, `plans`, or `wf`; deleting `lib/validate.ts` (the
other areas still use it); generating the document; deleting `domain/contracts`.

## Testing

- One new minimal unit test for `validation-error.ts`: the code per target, and that the message
  carries the field path. Deliberately small — this is the only place the refactor could silently
  change behavior.
- No new test module for `schemas.ts`; the request-level suite covers it through real requests.
- `server/src/app.public.test.ts` must pass **unmodified**. If a test needs changing to go green,
  that is a behavior regression, not a test that needs updating — treat it as a bug in the slice.

## Acceptance criteria

- [x] `server/src/routes/clients/{endpoints.ts,schemas.ts}` exist; `server/src/routes/clients.ts` is gone
- [x] `app.ts` uses `OpenAPIHono` with a `defaultHook`; the unconverted areas still mount and serve
- [x] `validation-error.ts` is a pure function with a minimal unit test (3 cases)
- [x] `app.public.test.ts` passes **with no existing assertion changed** — one test was *added* for the malformed-JSON envelope, per the checkpoint decision
- [x] `POST /api/clients` with `{}` still returns 400 with code `invalid_input`
- [x] A malformed clientId still returns 400 with code `invalid_id`
- [x] `/health` is still unauthenticated and `/api/*` still 401s in production without credentials
- [x] The clients-area schemas carry `.openapi(...)` names matching the components in `server/openapi.json`
- [x] `zod` and `hono` remain `catalog:` references in `server/package.json`
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass from the root (49 server + 37 client)
- [x] `pnpm --filter @strengthsync/server build` still succeeds

### Notes from implementation

**The `.openapi()` method is construction-order sensitive.** It is added by patching
`ZodType.prototype`, but Zod 4 copies prototype methods onto each instance at construction time, so a
schema built before `@hono/zod-openapi` loads never gains it — the patch is not retroactive.
`domain/model` is reached through `db/schema.ts` before the route layer in several entry points, so
`UuidSchema.openapi(...)` failed at runtime. `routes/clients/schemas.ts` therefore rebuilds the
schemas it needs to name via `z.object(Existing.shape)` using the `z` re-exported from
`@hono/zod-openapi`. Documented in that file, because it is non-obvious and will bite again.

**Declared responses are enforced on handlers.** When every declared response carries a content
schema, the library types the handler to return only those statuses — a bare `Response` will not
compile. That is why the clients area builds its 404s with `c.json(envelope, 404)` inline rather than
through `lib/errors.ts`, and why `requireClient`/`isResponse` are gone from this area. `lib/errors.ts`
is still used by `app.ts` and the unconverted areas.

**`@hono/zod-openapi` landed in the catalog**, not as a version literal, because `catalogMode: strict`
puts every added dependency there. `zod` and `hono` stayed `catalog:` as required.

**Blocker found for slice 006 and recorded there.** Generating the document from the real app throws
`RangeError: Maximum call stack size exceeded` on `domain/model`'s recursive `z.lazy` JSON schema. The
fix — an `.openapi('JsonValue')` registration on a route-layer copy of that schema — was verified in
isolation and written into slice 006 with the reasoning. Not fixed here: this slice does not generate
the document, and the placement decision belongs with the cutover.

## Blocked by

`issues/002-cut-dead-endpoints.md` — converting a route that is about to be deleted is wasted work.

**Requires the checkpoint above to be cleared before implementation starts.**

## User stories addressed

- User story 9 (validation declared with the route)
- User story 10 (schemas beside their endpoints)
- User story 16 (error codes preserved)
- User story 22 (approach explained before implementing)
