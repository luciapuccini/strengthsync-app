# API contracts (MVP)

The browser speaks only to `apps/api` on the Cloudflare origin. It never calls D1, the workflow runtime, or any other process.

This document defines the initial HTTP boundary. DTOs belong in `services/domain/contracts` and are validated by Zod on both sides of every API boundary.

## Authentication and conventions

- `GET /health` is unauthenticated.
- All `/api/*` routes require the shared HTTP Basic credential defined in [stack.md](./stack.md).
- `/wf/*` (Cloudflare Workflow start) routes are protected by the same shared Basic credential; there is no separate machine-to-machine secret because the workflow runs in-Worker.
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

### Health

```text
GET /health
→ 200 { ok: true }
```

### Clients and profile

The MVP has a small number of clients under the shared coach credential; `clientId` remains explicit so later identity does not change URLs.

```text
GET /api/clients
→ 200 { clients: Client[] }

POST /api/clients
body: { display_name: string }
→ 201 { client: Client }

GET /api/clients/:clientId
→ 200 { client: Client }

GET /api/clients/:clientId/profile
→ 200 { profile: ClientProfile }

PUT /api/clients/:clientId/profile
body: UpdateClientProfile
→ 200 { profile: ClientProfile }
```

`UpdateClientProfile` is the editable subset of `ClientProfile`: it excludes `id`, `client_id`, and `updated_at`.

### Plans

```text
GET /api/clients/:clientId/plans
→ 200 { plans: Plan[] }

GET /api/clients/:clientId/plans/active
→ 200 { plan: Plan }

GET /api/clients/:clientId/plans/:planId
→ 200 { plan: Plan }
```

Plan creation and activation are workflow-only in the MVP. The browser starts plan generation through the asynchronous workflow endpoint below; it never sends a plan document or activates a plan directly.

```typescript
type GeneratedPlanInput = {
  label: string;
  total_weeks: number;
  week_template: PlanDay[];
  rationale?: string | null;
};
```

The generated-plan activation command archives the prior active plan and creates week 1 in one atomic D1 batch.

### Weeks and training logs

```text
GET /api/clients/:clientId/weeks/current
→ 200 { week: Week }

GET /api/clients/:clientId/weeks
query: ?status=completed&planId=:planId
→ 200 { weeks: Week[] }

GET /api/clients/:clientId/weeks/:weekId
→ 200 { week: Week }
```

The UI updates one day at a time. It must not replace a whole week document, preventing stale browser state from silently overwriting other days.

Athlete Save always marks the day completed. The server owns `completed` / `completed_at`.

```text
POST /api/clients/:clientId/weeks/:weekId/days/:dayIndex/save
body: SaveDayLog
→ 200 { week: Week }
```

```typescript
type SaveDayLog = {
  exercises: Array<{
    exercise_key: string;
    skipped: boolean;
    feedback: ExerciseFeedback | null;
    sets: Array<{
      performed_reps: number;
      performed_weight_kg: number | null;
    }>;
  }>;
};
```

Low-level day patch (tests / tools) still accepts an explicit `completed` flag:

```text
PATCH /api/clients/:clientId/weeks/:weekId/days/:dayIndex
body: UpdateDayLog
→ 200 { week: Week }
```

```typescript
type UpdateDayLog = {
  completed: boolean;
  exercises: Array<{
    exercise_key: string;
    skipped: boolean;
    feedback: ExerciseFeedback | null;
    sets: Array<{
      performed_reps: number;
      performed_weight_kg: number | null;
    }>;
  }>;
};
```

Rules:

- Only an `in_flight` week can be changed.
- Each `exercise_key` must exist in that day’s schedule.
- When an exercise is `skipped`, its `sets` must be empty.
- The request supplies logs for every exercise currently scheduled on that day.
- `POST .../save` always sets `completed: true` (and `completed_at`).
- A completed week is immutable through public routes.

## Workflow API

Workflow requests are asynchronous. The API Worker validates the shared Basic credential and starts a Cloudflare Workflow instance directly (the workflow runs in-Worker, bound as `STRENGTHSYNC_WORKFLOW`). The route returns immediately and never waits for model output.

```text
POST /wf/complete-week
body: { clientId: string }
→ 200 { instanceId: string, details: WorkflowStatus }
```

`instanceId` is the Cloudflare Workflow instance id; `details` is the initial `instance.status()` of the run. The UI does not poll workflow status.

### Workflow transition rules

- Each start creates a new Cloudflare Workflow instance. The API never attaches to a prior instance.
- The workflow first finds and completes the client's sole `in_flight` week, then branches: next-week generation when weeks remain, or plan turnover when the completed week is the plan's last (see [workflows.md](./workflows.md)).
- D1 enforces at most one `in_flight` week per client.
- Plan turnover creates and activates a new plan atomically; it cannot leave two active plans.

## Internal workflow-to-data API (retired)

The Temporal-era `/internal/*` commands were the bridge between the local `apps/workflows`
worker and D1. In the Cloudflare Workflow implementation, the workflow runs inside `apps/api`
with the D1 binding and reads/writes the database directly (`createDb(this.env.DB)`); no
separate internal API or service secret is used by the workflow. The `/internal/*` routes
were removed entirely.

## Deferred contract: chat

Streaming chat is explicitly deferred in [mvp_scope.md](../mvp_scope.md). When reintroduced, it keeps the existing `/agents/*` streaming transport but obtains profile, active plan, and current week through the same live API/domain layer—never bundled JSON or direct D1 access from the browser.

## Compatibility notes

This replaces the POC's blocking endpoints:

| POC route | MVP replacement |
| --- | --- |
| `GET /api/progress/history` | `GET /api/clients/:clientId/weeks?status=completed` |
| `POST /api/progress/day` | Narrow `PATCH` routes for day/exercise logs |
| `POST /api/workflows/weekly-progress` | Async `POST /wf/complete-week` (Cloudflare Workflow start) |
| `POST /api/workflows/plan-generation` | Plan turnover is an internal branch of `POST /wf/complete-week` (see [workflows.md](./workflows.md)) |
| `GET /api/workflows/:workflowId` | Removed; workflow status is observed through Cloudflare logs/dashboard |
