# Reconcile the client against the generated contract

**STATUS: DONE**

## Parent PRD

`issues/prd-zod-first-api-contract.md` — see Further Notes: "Known generation friction".

## What to build

Close the loop. The document is now Zod-derived, so the client's generated types change shape in
places where the hand-written spec had been quietly approximating. This slice absorbs that diff and
proves the end-to-end path works in a browser.

Regenerate `client/src/api/openapi.d.ts` and fix the fallout. Expected friction, in rough order of
likelihood:

**Recursive JSON fields.** `ClientProfile`'s free-form columns — `goals`, `body_composition`,
`strength_loads`, `nutrition`, `swimming`, `schedule_preferences` — are `z.record(z.string(), …)`
over a recursive `z.lazy` union (`server/src/domain/model/index.ts:73-84`).

Slice 003 established that this schema **must** carry an `.openapi('JsonValue')` registration or the
generator overflows the stack (see the blocker note in slice 006). Assuming 006 resolved it that way,
the document emits a real `JsonValue` component and `$ref`s to it — which is the same shape the
hand-written spec declared, so this may turn out to be a non-event rather than the churn originally
budgeted for here. Verify rather than assume: compare the generated `ClientProfile` against the
committed one before touching any client code.

**Vanished refinements.** The `superRefine` cross-field rules on `SaveDayLog` and `UpdateDayLog`
have no JSON Schema representation and simply do not appear in the document. This is correct and
expected — they still run server-side at runtime. It only means the client's types cannot express
"a skipped exercise has no sets", exactly as before.

**Input vs output shapes.** Response bodies want `io: 'output'` semantics and request bodies want
`io: 'input'`. Where a schema has defaults or transforms, these differ. Verify the generator emits
the right one per direction, and fix at the source rather than papering over it in the client.

**Format and nullability rendering.** `z.uuid()` and `z.iso.datetime()` now carry real `format`
annotations; nullable fields may render as unions where they were previously plain. With
`exactOptionalPropertyTypes: true` in `tsconfig.base.json`, an optional-vs-nullable mismatch is a
compile error at the call site, not a silent widening — so the typechecker will find these for you.

Then reconcile `client/src/api/types.ts`: its twenty aliases must all still resolve. If a component
name changed, prefer fixing the `.openapi(...)` registration on the server so the name matches what
the client already calls it — the client's vocabulary is the one users of the codebase read.

Finally, run the app. This is the first slice where the contract is generated end to end, so the
browser is the real test: exercise the tracker (day save, set logging, feedback) and the history
page against a live Worker.

Explicitly NOT in this slice: adding runtime Zod validation to the client, or changing any client
component's behavior. Types and imports only.

## Acceptance criteria

- [x] `client/src/api/openapi.d.ts` is regenerated from the generated document and committed — landed with slice 006
- [x] All **eighteen** aliases in `client/src/api/types.ts` resolve; none needed a server-side rename (the issue said twenty; it has been eighteen since `Coach` was dropped in slice 002)
- [x] `client/src/api/client.ts` compiles with no `any`, no `as` casts, and no `@ts-expect-error` added — none were added anywhere
- [x] The profile read/write path typechecks against the JSON fields, which now render as `{ [key: string]: unknown }`
- [x] `client/src/api/workflows.ts` still derives `CompleteWeekStarted` from the document
- [x] Client-side tests pass unmodified (37 tests)
- [x] Live verification against `wrangler dev` on :8787 — see below
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass from the root
- [x] `pnpm --filter @strengthsync/client build` and `pnpm --filter @strengthsync/server build` both succeed

### Notes from implementation

**No client code changed.** Every kind of friction this slice budgeted for was already absorbed:
recursive JSON by the `z.unknown()` decision, component naming by slice 006's registrations,
input-vs-output shapes because no schema in the contract has a default or transform. The only
correction was to this issue's own arithmetic — eighteen aliases, not twenty.

**Verified against a live Worker rather than only in the typechecker.** With the local D1 seeded:

| Checked | Result |
| --- | --- |
| `GET /health`, `/api/clients`, `.../weeks/current`, `.../plans/active`, `.../profile`, `.../weeks?status=completed` | all 200 with the expected bodies |
| `POST .../days/1/save` with a full day | 200, day marked `completed` with a `completed_at`, feedback and sets persisted |
| `PUT .../profile` with deeply nested JSON (`{nested:{deep:[1,2,{x:true}]}}`) | round-tripped byte-identical — the `unknown` columns still store real JSON |
| Malformed uuid → `invalid_id`; bad `status` filter and out-of-range `dayIndex` → `invalid_input` | error contract holds on the wire, not just in tests |
| Skipped exercise carrying sets | 400, refinement message intact — it runs at runtime despite being absent from the document |
| Incomplete day payload | 400 `exercise_log_mismatch` — `RepoError` still maps through `onError` |
| Malformed JSON body | 400 inside the envelope, confirming slice 003's `HTTPException` fix on a real request |
| `GET /openapi.json` | 200 `text/html` — the SPA fallback, not the spec |

**Not exercised: triggering a real workflow.** `POST /wf/complete-week` with a valid body starts a
Cloudflare Workflow that calls the model, so only the two 400 paths were hit live; the success path is
covered by the stub-binding test from slice 005.

**Not exercised: the browser UI itself.** The client bundle builds and every endpoint it calls was
verified over HTTP, but no page was driven in a browser. Slice 008's manual pass still owes that.

## Blocked by

`issues/006-generate-openapi-from-code.md` — there is nothing to reconcile against until the
document is generated from the routes.

## User stories addressed

- User story 4 (client types generated from the same document)
- User story 5 (typed paths and inferred bodies at call sites)
- User story 23 (recursive JSON fields survive generation)
- User story 24 (runtime refinements keep running)
