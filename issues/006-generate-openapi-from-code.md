# Generate openapi.json from the server's Zod schemas

**STATUS: DONE**

## Parent PRD

`issues/prd-zod-first-api-contract.md` — see Solution and Implementation Decisions: "Two-stage
codegen", "The document is a build artifact, not an endpoint", "The cutover is atomic".

## ✅ Blocker resolved before this slice

The recursive-`z.lazy` stack overflow is gone. The free-form JSON columns are now
`z.record(z.string(), z.unknown())` rather than a recursive union — a deliberate trade of validation
precision for a schema that renders, taken because nothing reads those columns structurally. The
static type stays `Record<string, JsonValue>` via a documented cast, because Cloudflare's
`Serializable<T>` constraint on `step.do()` rejects `unknown`. See `domain/model/index.ts`.

Generation was verified end to end against the real app: **9 path items, 18 components, no error.**
The `JsonValue` component no longer exists — the columns render as
`{"type":"object","additionalProperties":{}}` inline, which is the honest description of what they
now accept.

### Two gaps that verification exposed

**`/health` is missing from the generated document.** It is a plain `app.get()` in `app.ts`, not an
`app.openapi()` route, so it contributes nothing. The hand-written spec declares it (with a
`HealthResponse` component). Either declare it as a route in this slice or accept the operation count
dropping from 12 to 11 — decide, do not let it vanish silently.

**Several component names the client depends on are not registered yet.** The generated document
inlines them instead of emitting components. `client/src/api/types.ts` aliases all of these by name,
so every one of them must be registered before slice 007 can compile:

`DayType`, `ExerciseFeedback`, `ExerciseLog`, `PerformedSet`, `PlanDay`, `PlannedExercise`,
`WeekDay`, `WeekStatus`

They are all leaf schemas in `domain/model`, so the `z.object(X.shape).openapi('Name')` /
`z.enum(CONST).openapi('Name')` treatment used elsewhere applies. Register them in the area schema
file that owns them.

## What to build

The point of the whole PRD: `server/openapi.json` stops being hand-written and becomes generated
output. This is the atomic cutover — every route is a declarative definition after slice 005, so
the generated document is complete for the first time and can replace the hand-maintained one.

New — `server/scripts/gen-openapi.ts`:

- Builds the app and writes `getOpenAPI31Document()` to `server/openapi.json`
- Carries over the document metadata currently hand-written at the top of the spec: title
  ("StrengthSync Public API"), version, the `basicAuth` security scheme applied globally, and the
  single `/` server entry described as the Cloudflare Workers origin
- Writes deterministically — stable key order and a trailing newline — so the CI diff is meaningful
  rather than noisy

Running it:

- `node --experimental-strip-types` (`.nvmrc` pins 22.14.0, which needs the flag). The repo is
  already strip-safe: `tsconfig.base.json` sets `erasableSyntaxOnly: true` and relative imports
  carry explicit `.ts` extensions. If a transitive import objects, add `tsx` as a server
  devDependency and use it instead — note which was used in the commit message.
- Handlers never execute during generation, so a stub `Db` is fine. `db/index.ts` has no
  import-time side effects (`better-sqlite3` lives under `db/testing/`, which is not on this path).
- If constructing the app for generation proves awkward, extract a small document-building function
  that registers the same route definitions without needing config — but prefer reusing `createApp`
  so the document cannot drift from the app that actually serves.

Scripts:

- `server/package.json`: `gen:openapi` → runs the generator
- Root `package.json`: `gen:openapi` becomes two stages — generate the document from the server,
  then generate the client types from the document. `check:openapi` runs both into scratch paths
  and diffs both against the committed files.

**This is the moment the drift check becomes real.** Until now it regenerated types from a
hand-written document and compared them to themselves — self-consistency, not correctness. Now it
regenerates the document from the routes, so a route whose schema no longer matches the committed
contract fails CI.

No document route is mounted. `app.doc31()` is deliberately not called — the document stays a
build artifact and nothing new is exposed on the public origin.

Expect the generated document to differ from the hand-written one. That diff is the deliverable of
this slice: review it line by line, because it is the first evidence of where the hand-written spec
was lying about the server. Record anything surprising in the commit message. Reconciling the
**client-side** consequences of that diff is slice 007 — if the client types churn here, that is
expected and gets absorbed next.

## Acceptance criteria

- [x] `server/scripts/gen-openapi.ts` exists and writes `server/openapi.json`
- [x] Running the generator twice in a row produces no diff (deterministic output) — verified byte-for-byte
- [x] The generated document contains all 12 operations, the `basicAuth` scheme, and the server entry
- [x] The generated component names cover every name aliased in `client/src/api/types.ts`
- [x] `pnpm check:openapi` regenerates document **and** client types and passes
- [x] `git diff --exit-code server/openapi.json` is clean after `pnpm gen:openapi`
- [x] Deliberately breaking a route schema makes `pnpm check:openapi` fail — verified by adding a field to `CreateClientInput`, then reverted
- [x] No document route is served — `/openapi.json`, `/doc` and `/openapi` all 404; `app.doc31()` is called nowhere
- [x] The diff between the old hand-written document and the generated one is reviewed and summarized in the commit message
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass from the root (53 server + 37 client)
- [x] `pnpm --filter @strengthsync/server build` still succeeds

### Notes from implementation

**Both gaps found during slice 005's verification were closed.** `/health` became an `app.openapi()`
route in the new `routes/health.ts` — declared with `security: []` so it does not inherit the global
`basicAuth` requirement — which keeps the operation count at 12. The eight leaf components the client
aliases (`DayType`, `WeekStatus`, `ExerciseFeedback`, `PerformedSet`, `ExerciseLog`, `WeekDay`,
`PlannedExercise`, `PlanDay`) are now registered in the area schema files that own them, and are
wired into their parents by field override so the parents `$ref` them rather than inlining.

**The document diff is smaller than expected: same 12 operations, 27 of the old 33 components.**
Nothing was added; six were dropped, all deliberately:

| Dropped | Why |
| --- | --- |
| `Uuid`, `ISODate`, `ISODateTime` | Format aliases. Now inlined as `{type: string, format: uuid \| date \| date-time}` — same constraint, one less indirection |
| `ClientStatus`, `PlanStatus` | Enums with no client alias; inlined at their single use site |
| `JsonValue` | Removed with the recursive schema, by decision |

`components.responses` also disappeared: the shared `Unauthorized`/`NotFound`/`BadRequest` response
objects are now declared inline per route. Same bodies, no `$ref`.

**`additionalProperties: false` is gone from every object, and that is a correction, not a
regression.** The hand-written spec claimed the API rejects unknown keys. It does not — Zod strips
them. The generated document now describes what the server actually does.

**The client needed no changes at all.** All twenty aliases in `client/src/api/types.ts` still
resolve and the client typechecks against the regenerated types, so slice 007's budgeted friction did
not materialise.

## Blocked by

`issues/005-convert-plans-and-workflow-routes.md` — the cutover is atomic. Until every area is a
declarative route, a generated document would be missing endpoints and the client would lose types
for them.

## User stories addressed

- User story 1 (one source of truth)
- User story 2 (document generated from the schemas)
- User story 3 (CI fails on drift)
- User story 19 (generated artifacts committed)
