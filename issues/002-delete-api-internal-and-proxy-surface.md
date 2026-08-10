# Delete the API's internal command surface and workflow proxy

## Parent PRD

`issues/prd.md` — see Implementation Decisions: "API deletion", "Test adaptation without new tests", and the API parts of "Config and docs"; Testing Decisions.

## What to build

Shrink the Worker's HTTP surface to public routes plus the Cloudflare workflow trigger by deleting the two Temporal-era route groups: the workflow-proxy routes (which forwarded browser requests through the tunnel) and the internal command routes (which served Temporal activities). Keep the entire public API test suite green by re-seeding test state through the remaining plan repository function directly, following the existing prior art in the suite (the test that adjusts week dates through the test database handle).

Deletions:

- `apps/api/src/routes/internal.ts` (internal command routes) and `apps/api/src/routes/workflows.ts` (workflow proxy routes, incl. `WorkflowApiConfig`, `WORKFLOW_API_TIMEOUT_MS`)
- The service-secret middleware in `apps/api/src/middleware/auth.ts`
- The associated app configuration fields in `apps/api/src/app.ts` (`internalServiceSecret`, `workflowApi`) and their route mounting
- Env plumbing in `apps/api/src/index.ts` (`INTERNAL_API_SERVICE_SECRET`, `WORKFLOW_API_URL`, `WORKFLOW_SERVICE_SECRET`) and the stale module docstring
- `apps/api/src/app.proxy.test.ts` and `apps/api/src/app.lifecycle.test.ts` (lifecycle coverage loss accepted per PRD; core logic stays covered at the repository layer)
- The `/internal/*` 403 case in `apps/api/src/app.public.test.ts`
- The `/internal/*` pattern in `run_worker_first` in `apps/api/wrangler.jsonc`
- The unused `openai` dependency in `apps/api/package.json` (no imports in `src/`)
- The empty file `apps/api/src/agent/index.ts`

Adaptations (not rewrites):

- Rework `apps/api/src/testkit.ts` `activatePlanViaInternalApi` to seed through the remaining plan repository function directly
- Delete the testkit helpers orphaned by the removed tests: `INTERNAL_SECRET`, `internalHeaders`, `completeWeekViaInternalApi`, `createNextWeekViaInternalApi`, `patchDayViaApi`, `markAllDaysCompletedViaApi` — verify no surviving caller first
- Scrub `apps/api/.dev.vars.example` (`INTERNAL_API_SERVICE_SECRET`, commented `WORKFLOW_API_URL`/`WORKFLOW_SERVICE_SECRET`) and the git-ignored `apps/api/.dev.vars` (also drop the active `BRAINTRUST_*` entries — nothing in `apps/api/src` reads them)
- Regenerate the committed `apps/api/worker-configuration.d.ts` (`pnpm --filter @strengthsync/api types`) after the env scrub so the `BRAINTRUST_*`, `INTERNAL_API_*`, and `WORKFLOW_*` types disappear

## Acceptance criteria

- [ ] The Worker exposes only public routes, `/health`, and the `/wf/*` Cloudflare workflow trigger; `/internal/*` and the workflow-proxy routes return 404
- [ ] No `INTERNAL_API_SERVICE_SECRET`, `WORKFLOW_API_URL`, `WORKFLOW_SERVICE_SECRET`, or `BRAINTRUST_*` references remain in `apps/api/src`, `apps/api/.dev.vars.example`, or `apps/api/worker-configuration.d.ts`
- [ ] The public API test suite passes with plan seeding done through the repository function, and the testkit contains no internal-endpoint helpers
- [ ] `apps/api/wrangler.jsonc` `run_worker_first` no longer lists `/internal/*`
- [ ] `pnpm --filter @strengthsync/api lint`, `typecheck`, and `test` all pass

## Blocked by

None - can start immediately. Recommended after `issues/001-remove-generate-plan-ui.md` (consumer before provider), but not required: UI tests mock fetch and stay green either way.

## User stories addressed

- User story 4
- User story 5
- User story 10 (API portion)
- User story 13
- User story 14 (API portion)
