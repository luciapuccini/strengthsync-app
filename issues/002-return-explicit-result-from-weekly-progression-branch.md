## Parent PRD

`docs/architecture/workflows.md`

## What to build

Make the weekly-progression branch of the unified workflow return an explicit result, so both branches return the same combined shape.

In `apps/api/src/workflows/strengthsync-workflow.ts`, after the `save-next-week` step, return:

```ts
{ plan_complete: false, next_week_id: savedWeek.id }
```

The DB write stays exactly the same (`saveNextWeek`). Only the return value changes.

## Acceptance criteria

- [ ] Weekly path returns `{ plan_complete: false, next_week_id: savedWeek.id }`.
- [ ] DB write shape is unchanged.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.

## Blocked by

- `issues/001-rename-workflow-file.md`

## User stories addressed

- Weekly progression path from `docs/architecture/workflows.md`.

"STATUS":"DONE"
