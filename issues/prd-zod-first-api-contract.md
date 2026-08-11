# PRD — Zod-first API contract

## Problem Statement

I maintain the same API contract twice. The machine-readable `openapi.json` is hand-written
in a `shared` workspace, and the Zod schemas my routes actually validate against live in
the server. Nothing connects them. When I change an endpoint's payload I have to remember
to edit the spec by hand, and if I forget, nothing tells me — CI only checks the spec
against the types it generated from itself, which is a tautology. The contract can claim
one thing while the server does another, indefinitely.

The `shared` package also does not deserve to exist. It is named for something it isn't:
nothing shares it. The server never reads it, the client is its only consumer, and it
describes the server's own public API. It is a workspace, a `tsconfig` reference, an eslint
boundary, a CI step, and a dependency edge — all of that ceremony for two files that belong
to the server.

Separately, the schemas themselves are hard to navigate. A `domain` folder holds a mix of
database entities, HTTP request DTOs, and workflow-only commands, so to understand one
endpoint I have to read three folders. And some endpoints in the spec have no caller at
all, so I would be porting dead weight.

## Solution

One source of truth, flowing one direction:

**Zod schemas on the server → generated `openapi.json` → generated client types → typed
`openapi-fetch` calls.**

The server declares each route once, with its Zod schemas attached. That single declaration
does two jobs: it validates incoming requests at runtime, and it emits the OpenAPI document.
The document is a generated build artifact of the server, committed to the repo. The client's
types are generated from that document, also committed. CI regenerates both and fails on any
diff — so for the first time, a route that drifts from the published contract breaks the build.

Nothing is hand-written twice, and drift stops being a discipline problem and becomes a
structural impossibility.

Alongside that, the layout gets honest: the `shared` workspace disappears and the contract
moves in with the server that implements it. The workspace becomes the two things I actually
deploy. Schemas for an endpoint move next to that endpoint, while the entity vocabulary that
persistence and workflows also depend on stays central. Endpoints nobody calls are deleted
before any of the porting work begins.

At the call site nothing changes stylistically — the client keeps using `openapi-fetch` with
typed paths and inferred bodies. It just now gets those types from a document that cannot lie.

## User Stories

1. As the developer, I want the API contract to have exactly one source of truth, so that I never hand-edit a document to match code I already wrote.
2. As the developer, I want the OpenAPI document generated from the server's Zod schemas, so that a schema change cannot silently diverge from the published contract.
3. As the developer, I want CI to fail when the committed contract no longer matches the server's routes, so that drift is caught in review instead of in the browser.
4. As the developer, I want the client's request and response types generated from that same document, so that a server-side rename becomes a client compile error.
5. As the developer, I want typed endpoint paths with inferred bodies at every call site, so that I get autocomplete for routes and payloads instead of stringly-typed fetches.
6. As the developer, I want the workspace to contain only the two things I actually deploy, so that the repo layout matches the deployment topology.
7. As the developer, I want the contract to live with the server that implements it, so that its ownership is obvious to anyone reading the tree.
8. As the developer, I want the client to depend on no workspace package at all, so that the browser bundle cannot accidentally reach into server code.
9. As the developer, I want request validation declared together with the route, so that I cannot add an endpoint and forget to validate its input.
10. As the developer, I want the schemas for an endpoint to live beside that endpoint, so that I can read one folder to understand one area of the API.
11. As the developer, I want the shared entity vocabulary to stay in one place, so that persistence, workflows, and HTTP all agree on what a Week is.
12. As the developer, I want the persistence layer to stop depending on HTTP request shapes, so that changing an API payload does not ripple into the database layer.
13. As the developer, I want workflow-only contracts separated from HTTP contracts, so that I can tell at a glance what the browser is allowed to send.
14. As the developer, I want dead endpoints removed before the migration, so that I do not spend effort porting routes nobody calls.
15. As the developer, I want the workflow trigger endpoint validated like every other endpoint, so that a malformed body returns a 400 instead of being cast and trusted.
16. As the developer, I want the existing HTTP error codes preserved exactly, so that the client's error handling keeps working through the refactor.
17. As a reviewer, I want each change to arrive as a small, independently green commit, so that I can review one concern at a time.
18. As the developer, I want the pre-commit gate to pass on every slice, so that the branch is never broken mid-migration.
19. As the developer, I want the generated artifacts committed, so that a fresh clone typechecks without running codegen first.
20. As the developer, I want the migration to avoid introducing a build-task cycle, so that the monorepo keeps building.
21. As the developer, I want the architecture docs to name the real source of truth, so that future me does not hand-edit a generated file.
22. As the developer, I want the validation-error approach explained to me before it is implemented, so that I understand how the error codes survive the switch.
23. As the developer, I want the recursive JSON profile fields to survive generation intact, so that the profile payload keeps its shape.
24. As the developer, I want runtime refinements that JSON Schema cannot express to keep running, so that generating a document does not weaken validation.

## Implementation Decisions

**Toolchain.** `@hono/zod-openapi` (the official Hono middleware package) is the Hono
equivalent of the Express `zod-to-openapi` flow. Its peer dependencies match the versions
already governed by the workspace catalog, so it introduces no version drift. Routes are
declared with its route-definition helper and registered on its Hono subclass; that one
declaration produces both the runtime validation and the document entry.

**The document is a build artifact, not an endpoint.** It is generated by a script,
committed, and diffed in CI. No document route is mounted on the Worker, so nothing new is
exposed on the public origin.

**Contract ownership and consumption.** The spec becomes an artifact of the server package.
The client consumes generated types through a relative in-package import rather than a
workspace dependency. This is deliberate: the build graph already declares that the Worker's
build depends on the client's build, because the Worker bundles the SPA as static assets. A
client-to-server package edge would close that into a cycle and the task runner would
hard-error. Generating the types into the client keeps the graph acyclic and additionally
lets the client's import boundary be tightened to "no workspace packages at all".

**Two-stage codegen.** Stage one generates the document from the server's registered routes.
Stage two generates the client's TypeScript types from that document. Both outputs are
committed; the check script re-runs both and diffs.

**Layering.** Three-way split of what is today one mixed folder:
- Entity schemas (the SQL records and their value types) stay central. They are the shared
  vocabulary of persistence, both workflows, the coaching rules, and HTTP.
- HTTP-shaped schemas — request DTOs, path and query parameters, response envelopes, and the
  error envelope — move into their route area.
- Workflow-only commands move into the workflow layer; they are never accepted over HTTP.

The persistence layer stops importing HTTP DTO types and derives its input types from the
entity vocabulary instead. This is what makes the move legal: the existing import-boundary
rules forbid the database layer from importing route code, so the DTOs cannot move next to
the endpoints until persistence no longer depends on them.

**Component naming is preserved.** The client aliases twenty component schemas by name, so
the generated document must register those same names. Naming is applied in the route layer
rather than on the entity schemas, keeping the entity vocabulary free of HTTP concerns.

**Error envelope is preserved exactly.** A single validation hook maps failures to today's
response body. Failures on path parameters keep the existing id-specific code; body and query
failures keep the generic invalid-input code. The message keeps its field-path prefix.

**Parameter coercion.** Path and query parameters arrive as strings, so the numeric day index
and the enum-valued status filter are coerced and range-checked at the boundary, preserving
the current 400 responses for out-of-range and unknown values.

**Endpoint reduction first.** Three read endpoints have no client caller. They are deleted
before the migration so they are never ported.

**The cutover is atomic.** While route areas are half-converted, a generated document would
be incomplete, so the hand-written document stays authoritative until every area is converted.
Only then does generation switch on and the hand-written file get deleted.

**Manual validation helpers are removed as a consequence, not as a precursor.** The body
parser is the validator; it cannot be deleted before declarative validation exists to replace
it. It dissolves area by area as each area converts.

## Testing Decisions

A good test here asserts externally observable behavior: for an HTTP route, that means the
status code and response body you get from a request, not which helper produced it. The
refactor changes almost every internal seam — helpers are deleted, folders move, validation
becomes declarative — while the observable API is meant to stay identical. So the existing
request-level suite is the safety net, and it should be extended, never relaxed.

**Prior art in this repo:**
- The public HTTP suite drives the app through its request interface and asserts status codes
  and error codes. This is the primary contract test and the model to follow.
- Repository tests run against a fake D1 backed by an in-memory SQLite database.
- Schema tests assert parse success and failure directly on the Zod schemas.
- Client-side API tests cover the typed fetch wrappers.

**What gets a new test:**
- **The validation error mapper, minimally.** It is extracted as a pure function from the
  validation hook — validation failure plus target in, status and error code and message out.
  This is the one place where deleting the manual validators could silently change behavior,
  so it gets direct coverage. Kept deliberately small: the code mapping per target, and that
  the message retains its field path.

**What does not get new test modules:** the document builder and the per-area schema modules.
The request-level suite already exercises the schemas through real requests, and the
regenerate-and-diff check in CI is itself the test of the generator — if the document stops
matching the routes, the build fails.

**Coverage that must not be lost:** deleting the mixed contracts folder also deletes its test
file. Its assertions — in particular the cross-field rule that a skipped exercise must carry
no performed sets — relocate alongside the schemas that moved, in the same slice.

**Checkpoint:** before the validation hook is implemented, the approach is explained and
agreed rather than just written. See story 22.

## Out of Scope

- No new endpoints, and no frontend for the profile routes that exist but have no page.
- No workflow status polling in the client.
- No document served at runtime, and no Swagger/Scalar/Redoc documentation UI.
- No authentication changes; the shared Basic credential and the routes it covers stay as they are.
- No runtime schema validation in the client — the client gets types only, as it does today.
- No database schema or migration changes.
- No change to the deploy pipeline beyond repointing the contract-drift check.
- Repairing the root scripts that reference missing files (the dependency-policy check and the
  TypeScript metrics helpers) is a separate concern — see Further Notes.

## Further Notes

- **Pre-existing breakage, not caused by this work:** the root package manifest declares
  scripts pointing at files that do not exist in the scripts directory, so those commands fail
  today. Worth its own issue; deliberately untouched here.
- **Zod extension mechanics:** the naming helper is added by extending Zod's prototype, so the
  route layer imports the library's re-exported Zod while the entity vocabulary keeps importing
  Zod directly. Both resolve to a single installed Zod instance under the package manager's
  linking, so the extension applies to schemas built either way. If that ever stops holding,
  the symptom is a missing method at the naming call site, not a silent misbehavior.
- **Generation runtime:** the generator imports server TypeScript directly. The pinned Node
  version supports type stripping behind a flag, and the repo is already strip-safe — it
  forbids non-erasable TypeScript syntax and uses explicit extensions in relative imports. A
  transpiler dependency is the fallback if a transitive import objects.
- **Known generation friction, expected in the final slice:** the profile's free-form JSON
  fields are a recursive schema, which generates as internal definitions with references
  rather than as a single named component; and cross-field refinements have no JSON Schema
  representation, so they vanish from the document while still running at runtime. Neither is
  a defect, but both change the emitted types and need reconciling against the client's aliases.
- **Direction of travel:** once the document is generated from code, the architecture doc stops
  being a hand-maintained mirror of the API and becomes prose about conventions, pointing at the
  generated artifact for specifics.
