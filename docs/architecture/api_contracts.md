# API contracts (MVP)

The browser speaks only to `apps/api` on the Cloudflare origin. It never calls D1, Temporal Cloud, or the local workflow process.

This document defines the initial HTTP boundary. DTOs belong in `services/domain/contracts` and are validated by Zod on both sides of every API boundary.

## Authentication and conventions

- `GET /health` is unauthenticated.
- All `/api/*` routes require the shared HTTP Basic credential defined in [stack.md](./stack.md).
- All `/internal/*` routes require a separate service secret. They are reachable only by the local workflow process through the private tunnel.
- JSON responses use `application/json`.
- Invalid input returns `400`; missing records return `404`; invalid shared credentials return `401`; invalid internal service credentials return `403`.
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
- A completed week is immutable through public routes.

## Workflow API

Workflow requests are asynchronous. The API Worker validates the shared Basic credential, forwards the request through the tunnel to the local workflow-start API, and returns immediately. It never waits for model output.

```text
POST /api/clients/:clientId/workflows/weekly-progression
body: { week_id: string }
→ 202 { workflow_id: string, status: "running" }

POST /api/clients/:clientId/workflows/plan-generation
body: { notes?: string }
→ 202 { workflow_id: string, status: "running" }

GET /api/workflows/:workflowId
→ 200 WorkflowStatus

POST /api/workflows/:workflowId/retry
→ 202 { workflow_id: string, status: "running" }
```

```typescript
type WorkflowStatus =
  | {
      workflow_id: string;
      type: "weekly_progression";
      status: "running";
      started_at: string;
    }
  | {
      workflow_id: string;
      type: "weekly_progression";
      status: "succeeded";
      started_at: string;
      finished_at: string;
      result: {
        next_week_id: string | null;
        plan_complete: boolean;
      };
    }
  | {
      workflow_id: string;
      type: "plan_generation";
      status: "running";
      started_at: string;
    }
  | {
      workflow_id: string;
      type: "plan_generation";
      status: "succeeded";
      started_at: string;
      finished_at: string;
      result: {
        plan_id: string;
        first_week_id: string;
      };
    }
  | {
      workflow_id: string;
      type: "weekly_progression" | "plan_generation";
      status: "failed";
      started_at: string;
      finished_at: string;
      error: { code: string; message: string };
    };
```

`workflow_id` is the Temporal workflow id, not a `JobRun` database row. Temporal retains workflow status/result; D1 stores only product state such as plans and weeks.

### Workflow transition rules

- Weekly progression first validates that `week_id` is the client’s current `in_flight` week, then marks it completed as part of the workflow.
- A duplicate start for the same week must return the existing running workflow or a conflict; it must not create two next weeks.
- Retry starts a new Temporal workflow only after the previous one has failed. The workflow’s data commands are idempotent.
- Plan generation creates and activates a new plan atomically; it cannot leave two active plans.

## Internal workflow-to-data API

`apps/workflows` cannot access D1 directly. Activities use these narrow, service-authenticated commands instead of generic database CRUD.

```text
GET /internal/clients/:clientId/weekly-context?weekId=:weekId
→ { client, profile, active_plan, week, coaching_rules }

POST /internal/clients/:clientId/weeks/:weekId/complete
body: { workflow_id: string }
→ { week: Week }

POST /internal/clients/:clientId/weeks/next
body: {
  workflow_id: string;
  previous_week_id: string;
  schedule: WeekDay[];
}
→ { week: Week }

GET /internal/clients/:clientId/plan-generation-context
→ { client, profile, active_plan, completed_weeks, coaching_rules }

POST /internal/clients/:clientId/plans/activate-generated
body: {
  workflow_id: string;
  plan: GeneratedPlanInput;
}
→ { plan: Plan; first_week: Week }
```

The server must make these commands idempotent using `workflow_id`. A repeated Temporal activity invocation returns the already-created product state rather than duplicating a week or plan.

## Deferred contract: chat

Streaming chat is explicitly deferred in [mvp_scope.md](../mvp_scope.md). When reintroduced, it keeps the existing `/agents/*` streaming transport but obtains profile, active plan, and current week through the same live API/domain layer—never bundled JSON or direct D1 access from the browser.

## Compatibility notes

This replaces the POC’s blocking endpoints:

| POC route | MVP replacement |
| --- | --- |
| `GET /api/progress/history` | `GET /api/clients/:clientId/weeks?status=completed` |
| `POST /api/progress/day` | Narrow `PATCH` routes for day/exercise logs |
| `POST /api/workflows/weekly-progress` | Async `POST /api/clients/:clientId/workflows/weekly-progression` |
| `POST /api/workflows/plan-generation` | Async `POST /api/clients/:clientId/workflows/plan-generation` |
