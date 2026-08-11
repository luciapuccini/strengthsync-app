# Generate openapi.json from the server's Zod schemas

**STATUS: TODO**

## Parent PRD

`issues/prd-zod-first-api-contract.md` — see Solution and Implementation Decisions: "Two-stage
codegen", "The document is a build artifact, not an endpoint", "The cutover is atomic".

## ⚠️ Known blocker, found and diagnosed in slice 003

**Generation currently throws `RangeError: Maximum call stack size exceeded`.** Verified by building
the document from the real app after the clients area was converted. This is not a theoretical
friction — the generator dies outright, so it must be fixed before this slice can produce anything.

Cause: `jsonValueSchema` in `server/src/domain/model/index.ts:73` is a recursive `z.lazy` union. The
generator (`@asteasolutions/zod-to-openapi`) breaks recursion by emitting a `$ref` to a *named*
component. With no name registered it tries to inline the schema and recurses forever, dying inside
`isNullableSchema`.

Fix, already proven in isolation: give the recursive schema an `.openapi('JsonValue')` registration.
Naming it both stops the recursion and emits a `JsonValue` component — which is exactly the component
name the hand-written `server/openapi.json` already declares, so the generated document matches.

The constraint that makes this awkward: `.openapi()` comes from a `ZodType.prototype` patch applied
when `@hono/zod-openapi` loads, and **Zod 4 copies prototype methods onto each instance at
construction**, so a schema built before that module loads never gains the method. `domain/model` is
reached through `db/schema.ts` before the route layer in several entry points, so the recursive
schema has to be *constructed* in the route layer to be nameable. `.shape` rebuilding (the technique
`routes/clients/schemas.ts` uses for object schemas) does not apply to a `z.lazy`.

Decide deliberately where the named recursive schema lives — a shared route-layer module is the
obvious spot, since `ClientProfile` is the only current consumer but the pattern is not
clients-specific. Rebuilding `ClientProfile` around it means restating its six JSON columns
(`goals`, `body_composition`, `strength_loads`, `nutrition`, `swimming`, `schedule_preferences`),
which is a duplication worth guarding with a test that the rebuilt shape still accepts a real profile.

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

- [ ] `server/scripts/gen-openapi.ts` exists and writes `server/openapi.json`
- [ ] Running the generator twice in a row produces no diff (deterministic output)
- [ ] The generated document contains all 12 operations, the `basicAuth` scheme, and the server entry
- [ ] The generated component names cover every name aliased in `client/src/api/types.ts`
- [ ] `pnpm check:openapi` regenerates document **and** client types and passes
- [ ] `git diff --exit-code server/openapi.json` is clean after `pnpm gen:openapi`
- [ ] Deliberately breaking a route schema makes `pnpm check:openapi` fail (verify once by hand, then revert)
- [ ] No document route is served — `GET /openapi.json` against the running Worker returns the SPA fallback, not the spec
- [ ] The diff between the old hand-written document and the generated one is reviewed and summarized in the commit message
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass from the root
- [ ] `pnpm --filter @strengthsync/server build` still succeeds

## Blocked by

`issues/005-convert-plans-and-workflow-routes.md` — the cutover is atomic. Until every area is a
declarative route, a generated document would be missing endpoints and the client would lose types
for them.

## User stories addressed

- User story 1 (one source of truth)
- User story 2 (document generated from the schemas)
- User story 3 (CI fails on drift)
- User story 19 (generated artifacts committed)
