# API contracts (MVP)

The browser speaks only to `apps/api` on the Cloudflare origin. 

This document defines the initial HTTP boundary. The machine-readable source of truth is `packages/api-contract/openapi.json`; generated TypeScript types live in `packages/api-contract/openapi.d.ts`. Server-side Zod DTOs are in `services/domain/contracts` in this document's original layout and are validated at the API boundary.

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
Refer to `packages/api-contract/openapi.json` as souce of truth, and as such we need to keep it updated

Workflow requests are asynchronous. The API Worker validates the shared Basic credential and starts a Cloudflare Workflow instance directly (the workflow runs in-Worker, bound as `STRENGTHSYNC_WORKFLOW`). 
The route returns immediately and never waits for model output.[TODO]: The UI does not poll workflow status.


## Endpoints current state

Audited 2026-08-11 against UI callers (`apps/ui/src/api/client.ts`, `workflows.ts`) and HTTP-level tests (`apps/api/src/app.public.test.ts`). Not all 15 routes in `openapi.json` currently have a product consumer:

| Route | UI caller | HTTP test | Verdict |
| --- | --- | --- | --- |
| `GET /api/clients/{clientId}` | none | yes | Soft cut candidate — no product caller, but removing it means dropping its test too |
| `GET /api/clients/{clientId}/plans` | none | none | Cut candidate — fully dead: no UI caller, no HTTP test, no caller beyond direct repository unit tests |
| `GET /api/clients/{clientId}/weeks/{weekId}` | none | none | Cut candidate — same story as the plans list |

Also flagged, not a route change:

- `getProfile` / `updateProfile` (`GET`/`PUT .../profile`) are defined and unit-tested but no UI page calls them yet — there's no profile page built (only `clients-page`, `tracker-page`, `history`). Keep the routes; the missing frontend is the gap.
- `PATCH /.../days/{dayIndex}` is intentionally scoped as "tests/tools" per the workflow docs — not drift, just narrower than the `POST .../save` path.

All other routes have both a UI caller and test coverage.
