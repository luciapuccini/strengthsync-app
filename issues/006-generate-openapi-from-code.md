# Generate openapi.json from the server's Zod schemas

**STATUS: TODO**

## Parent PRD

`issues/prd-zod-first-api-contract.md` — see Solution and Implementation Decisions: "Two-stage
codegen", "The document is a build artifact, not an endpoint", "The cutover is atomic".

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
