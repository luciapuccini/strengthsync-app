# Reconcile the client against the generated contract

**STATUS: TODO**

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
over a recursive `z.lazy` union (`server/src/domain/model/index.ts:74-84`). Zod emits this as
internal `$defs` with `$ref`s rather than as the single flat `JsonValue` component the hand-written
spec declared. `openapi-typescript` renders that differently, and the generated `.d.ts` already
exports a `$defs` key, so the machinery exists — but the resulting type may be structurally
different from what `client/src/api/types.ts` and the profile call sites expect.

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

- [ ] `client/src/api/openapi.d.ts` is regenerated from the generated document and committed
- [ ] All twenty aliases in `client/src/api/types.ts` resolve; any rename was fixed on the server side
- [ ] `client/src/api/client.ts` compiles with no `any`, no `as` casts, and no `@ts-expect-error` added
- [ ] The profile read/write path typechecks against the recursive JSON fields
- [ ] `client/src/api/workflows.ts` still derives `CompleteWeekStarted` from the document
- [ ] Client-side tests (`client.test.ts`, `dayLog.test.ts`, `historyResource.test.ts`) pass unmodified
- [ ] `pnpm turbo dev` — the tracker page loads a current week, saves a day, and the history page lists completed weeks against `wrangler dev` on :8787
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass from the root
- [ ] `pnpm --filter @strengthsync/client build` and `pnpm --filter @strengthsync/server build` both succeed

## Blocked by

`issues/006-generate-openapi-from-code.md` — there is nothing to reconcile against until the
document is generated from the routes.

## User stories addressed

- User story 4 (client types generated from the same document)
- User story 5 (typed paths and inferred bodies at call sites)
- User story 23 (recursive JSON fields survive generation)
- User story 24 (runtime refinements keep running)
