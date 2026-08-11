# API contracts (MVP)

The browser speaks only to `server` on the Cloudflare origin. 

This document defines the initial HTTP boundary. The machine-readable source of truth is `server/openapi.json`, which lives beside the Worker that implements it; TypeScript types are generated from it into `client/src/api/openapi.d.ts` by `pnpm gen:openapi` and committed. Server-side Zod DTOs live under `server/src/domain/` and are validated at the API boundary.

## Authentication and conventions

- `GET /health` is unauthenticated.
- All `/api/*` routes require the shared HTTP Basic credential defined in [stack.md](./stack.md).
- `/wf/*` (Cloudflare Workflow start) routes are protected by the same shared Basic credential.
- JSON responses use `application/json`.
- Invalid input returns `400`; missing records return `404`; invalid shared credentials return `401`.
- Public route ids are UUIDs.

```typescript
type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
```

## Public API
Refer to `server/openapi.json` as source of truth, and as such we need to keep it updated. `pnpm check:openapi` in CI only proves the committed client types match that document — it does not yet prove the document matches the server's routes.

Workflow requests are asynchronous. The API Worker validates the shared Basic credential and starts a Cloudflare Workflow instance directly (the workflow runs in-Worker, bound as `STRENGTHSYNC_WORKFLOW`). 
The route returns immediately and never waits for model output.[TODO]: The UI does not poll workflow status.


## Endpoints current state

Audited 2026-08-11 against UI callers (`client/src/api/client.ts`, `workflows.ts`) and HTTP-level tests (`server/src/app.public.test.ts`). The audit found three routes with no product consumer; all three were cut, taking the surface from 15 operations to 12:

| Route | UI caller | HTTP test | Outcome |
| --- | --- | --- | --- |
| `GET /api/clients/{clientId}` | none | yes | **Cut.** Its malformed-uuid and unknown-client assertions were retargeted rather than dropped |
| `GET /api/clients/{clientId}/plans` | none | none | **Cut.** Fully dead: no UI caller, no HTTP test |
| `GET /api/clients/{clientId}/weeks/{weekId}` | none | none | **Cut.** Same story as the plans list |

The repository functions behind them (`getClient`, `listPlans`, `getWeek`) were kept — they still back `requireClient`, plan activation, and `updateDayLog` respectively. This was a reduction of HTTP surface, not of persistence capability. `app.public.test.ts` pins that the three paths are no longer routed.

Also flagged, not a route change:

- `getProfile` / `updateProfile` (`GET`/`PUT .../profile`) are defined and unit-tested but no UI page calls them yet — there's no profile page built (only `clients-page`, `tracker-page`, `history`). Keep the routes; the missing frontend is the gap.
- `PATCH /.../days/{dayIndex}` is intentionally scoped as "tests/tools" per the workflow docs — not drift, just narrower than the `POST .../save` path.

All other routes have both a UI caller and test coverage.
