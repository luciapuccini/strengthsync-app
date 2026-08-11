# Final verification gate

**STATUS: TODO**

## Parent PRD

`issues/prd-zod-first-api-contract.md` — see Testing Decisions and Out of Scope.

## What to build

No new behavior. This slice proves the PRD's central claim — that drift is now structurally
impossible rather than merely policed — and cleans up the documentation that still describes the old
world. It is the slice that catches anything the individual slices each assumed someone else would do.

### Prove the invariant

The claim is that a route and its published contract cannot diverge. Verify it adversarially, by
breaking things on purpose and confirming the build notices. Each of these should fail, and be
reverted after:

1. Add a field to a response schema without regenerating → `check:openapi` fails
2. Rename a component registration without regenerating → `check:openapi` fails
3. Change a request DTO without regenerating → `check:openapi` fails
4. Regenerate the document but not the client types → `check:openapi` fails
5. Delete a route → the document loses the path and `check:openapi` fails

Record the results. If any of these passes silently, the gate is not real and that is a bug to fix
in this slice.

### Confirm the end state

Tree matches the PRD's target:

```
server/
  openapi.json                 generated, committed, CI-diffed
  scripts/gen-openapi.ts
  src/
    domain/model/              entity vocabulary — db + workflows + coach + routes
    domain/coach/
    domain/workflow.ts         plan-generation shapes (NOT workflows/contracts.ts — see 005)
    routes/shared.ts           ApiError schema + response helpers
    routes/{clients,plans,weeks,wf}/{endpoints,schemas}.ts
    lib/                       errors.ts + validation-error.ts only
client/
  src/api/openapi.d.ts         generated from server/openapi.json, committed
```

Greps that must come back empty across the repo:

- [ ] `@strengthsync/shared`
- [ ] `domain/contracts`
- [ ] `parseBody`, `parseUuidParam`, `isResponse`
- [ ] `parseWeekFilter`
- [ ] `requireClient`, `lib/lookup`
- [ ] `shared/openapi`

### Documentation

`docs/architecture/api_contracts.md` needs a real rewrite, not a path fix. It currently asserts that
a hand-maintained document is the source of truth and that "we need to keep it updated" (:26) — the
whole point of this PRD is that this sentence is now false. It should instead describe the
conventions (auth, status codes, error envelope, uuid route ids) and point at the generated artifact
for specifics, naming the Zod schemas as the origin.

Also check for staleness introduced or exposed along the way:

- [ ] `docs/architecture/api_contracts.md` — rewritten as above; the "Endpoints current state" audit table reflects the 12 surviving routes
- [x] ~~`api_contracts.md` claimed `/wf/*` is protected by the shared Basic credential; `app.ts` applies `basicAuth` to `/api/*` only.~~ Resolved out-of-band: the doc was corrected to state the actual behaviour (`/wf/*` unauthenticated, `/api/*` guarded only under `NODE_ENV=production`). Leaving the code as-is is a deliberate MVP call, not an oversight
- [ ] `docs/architecture/monorepo_structure.md` — two packages, not three; referenced by a comment in `db/index.ts`
- [ ] `README.md` — layout and commands still accurate
- [ ] Any doc mentioning `services/domain`, `apps/api`, or `apps/ui` (pre-rename names)

### Housekeeping check

- [ ] `pnpm install --frozen-lockfile` succeeds from a clean `node_modules`
- [ ] CI's contract step runs the root `check:openapi` and nothing references the deleted workspace
- [ ] The `.claude/settings.local.json` permission entries for the old rename patterns are harmless but stale — note them, and remove if trivially safe

### Known pre-existing breakage — record, do not fix

Root `package.json` declares `deps:check` and four `ts:*` scripts pointing at `scripts/check-dependency-policy.mjs` and `scripts/ts-metrics.mjs`, but `scripts/` is empty, so all five commands fail today. This predates the PRD and is explicitly out of scope. Open a separate issue for it so it stops being invisible.

## Acceptance criteria

- [ ] All five adversarial drift scenarios fail the check, and all five are reverted
- [ ] Every grep listed above returns empty
- [ ] The end-state tree matches the PRD
- [ ] `docs/architecture/api_contracts.md` no longer claims a hand-maintained source of truth
- [ ] `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all pass from the root
- [ ] `pnpm turbo dev` — full manual pass: create a client, save a profile, load the current week, log sets with feedback, save a day, view history
- [ ] A separate issue exists for the broken root scripts
- [ ] All eight slice files in `issues/` are marked `STATUS: DONE`

## Blocked by

`issues/007-reconcile-client-types.md` — and by every slice before it. This is the last one.

## User stories addressed

- User story 3 (CI fails on drift — proven, not assumed)
- User story 17 (small independently green commits)
- User story 18 (pre-commit gate passes on every slice)
- User story 21 (docs name the real source of truth)
