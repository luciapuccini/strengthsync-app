# UI week tracker checkpoint

## Shipped

- Mobile-first current-week tracker in `apps/ui`, modeled on the POC Plan screen.
- Reducer-managed set logging, contiguous set toggles, skip and feedback controls, persisted day saves, and copy-week Markdown.
- React 19 `use()` data loading with Suspense, an error boundary, and an empty-week plan-generation prompt.
- Weekly-progression and plan-generation workflow start/status polling.
- Worker static assets with SPA fallback while `/api/*`, `/internal/*`, and `/health` continue to run through the API Worker.
- English demo client, profile, active six-week plan, and in-flight week adapted directly from `services/db/seed/data`.

## Local demo data

Apply migrations and the base coach seed once, then apply the idempotent demo seed:

```sh
pnpm --filter @strengthsync/api db:migrate:local
pnpm --filter @strengthsync/api db:seed:local
pnpm --filter @strengthsync/api db:seed:demo:local
```

The deterministic demo client ID is `00000000-0000-4000-8000-000000000010`.

## Decisions

- Scope remains the current week only; client management is retained as minimal boilerplate.
- UI copy and stored demo content are English.
- The database is the sole persistence layer; browser state is intentionally ephemeral.
- Tests target reducers, mappers, Markdown formatting, and API contract mapping rather than components.
- No new UI packages were added; the tracker uses the existing shadcn primitives plus lean badge and spinner components.

## Dependency review

The partial package scores recorded during setup were: React 83, React DOM 91, React Router DOM 64, class-variance-authority 66, and clsx 79. React Router DOM and class-variance-authority were retained despite scores below 70 because they are established, POC-proven dependencies already used by the UI.
