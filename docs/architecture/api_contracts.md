# API contracts (MVP)

The browser speaks only to `server` on the Cloudflare origin. 

This document defines the HTTP boundary. The machine-readable source of truth is `server/openapi.json`, which lives beside the Worker that implements it; TypeScript types are generated from it into `client/src/api/openapi.d.ts` by `pnpm gen:openapi` and committed.

Each route is declared once with `createRoute()` from `@hono/zod-openapi`, in `server/src/routes/<area>/endpoints.ts`. The Zod schemas it validates against live beside it in `server/src/routes/<area>/schemas.ts`; `server/src/domain/model/` holds the entity vocabulary those schemas are built from, and is shared with persistence and the workflows.

## Authentication and conventions

- `GET /health` is unauthenticated.
- `/api/*` requires the shared HTTP Basic credential defined in [stack.md](./stack.md) — **but only when `NODE_ENV=production`**. `wrangler dev` runs with `NODE_ENV=development`, where the middleware is not mounted at all and every `/api/*` route answers without credentials.
- `/wf/*` (Cloudflare Workflow start) is **not authenticated**. `app.ts` mounts Basic auth on `/api/*` only, so `POST /wf/complete-week` will start a workflow instance for any caller that reaches the origin. Known and accepted for the MVP.
- JSON responses use `application/json`.
- Invalid input returns `400`; missing records return `404`; invalid shared credentials return `401`.
- Public route ids are UUIDs, enforced by the route's declared param schema.

Every error response uses one envelope, built by `errorResponse` in `server/src/lib/errors.ts` and documented as the `ApiError` component by `server/src/routes/shared.ts`:

```typescript
type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
```

Validation failures are mapped to a code by `server/src/lib/validation-error.ts`, which is the single hook every route area is constructed with:

| Failure | Code |
| --- | --- |
| Malformed UUID in the path | `invalid_id` |
| Anything else — body, query, or a non-id path param such as `dayIndex` | `invalid_input` |

Cross-field rules (for example: a skipped exercise carries no performed sets) are Zod refinements. They run on every request but have no JSON Schema representation, so they do not appear in the generated document.

## Public API
Refer to `server/openapi.json` as source of truth, and as such we need to keep it updated. `pnpm check:openapi` in CI only proves the committed client types match that document — it does not yet prove the document matches the server's routes.

Workflow requests are asynchronous. `POST /wf/complete-week` validates its body (`clientId` must be a UUID) and starts a Cloudflare Workflow instance directly — the workflow runs in-Worker, bound as `STRENGTHSYNC_WORKFLOW`. It returns the instance id immediately and never waits for model output. [TODO]: the UI does not poll workflow status.


## Endpoints current state

Audited 2026-08-11 against UI callers (`client/src/api/client.ts`, `workflows.ts`) and HTTP-level tests (`server/src/app.public.test.ts`). The audit found three routes with no product consumer; all three were cut, taking the surface from 15 operations to 12:

| Route | UI caller | HTTP test | Outcome |
| --- | --- | --- | --- |
| `GET /api/clients/{clientId}` | none | yes | **Cut.** Its malformed-uuid and unknown-client assertions were retargeted rather than dropped |
| `GET /api/clients/{clientId}/plans` | none | none | **Cut.** Fully dead: no UI caller, no HTTP test |
| `GET /api/clients/{clientId}/weeks/{weekId}` | none | none | **Cut.** Same story as the plans list |

The repository functions behind them (`getClient`, `listPlans`, `getWeek`) were kept — they still back the inline client-existence checks, plan activation, and `updateDayLog` respectively. This was a reduction of HTTP surface, not of persistence capability. `app.public.test.ts` pins that the three paths are no longer routed.

Also flagged, not a route change:

- `getProfile` / `updateProfile` (`GET`/`PUT .../profile`) have api-client wrappers and client-side tests, but no UI page calls them — there's no profile page built (only `clients-page`, `tracker-page`, `history`). Keep the routes; the missing frontend is the gap.
- `PATCH /.../days/{dayIndex}` is intentionally scoped as "tests/tools" per the workflow docs — not drift, just narrower than the `POST .../save` path.

All other routes have both a UI caller and test coverage.
