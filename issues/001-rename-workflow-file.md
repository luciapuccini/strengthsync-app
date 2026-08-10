## Parent PRD

`docs/architecture/workflows.md`

## What to build

Rename the Cloudflare Workflow file so its name matches the unified workflow that now handles both weekly progression and plan turnover.

- Rename `apps/api/src/workflows/complete-week.ts` to `apps/api/src/workflows/strengthsync-workflow.ts`.
- Update the export in `apps/api/src/index.ts`.
- Update doc references that point to the old filename.

This issue makes no behavior change.

## Acceptance criteria

- [ ] File is renamed and all imports still resolve.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] No runtime behavior changes.

## Blocked by

None - can start immediately.

## User stories addressed

- Plan-turnover branch from `docs/architecture/workflows.md`.
