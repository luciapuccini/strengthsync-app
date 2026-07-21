# StrengthSync MVP

## Problem

Training and health data only matter if they turn into useful coaching decisions. StrengthSync helps a coach—or a self-coached athlete—turn weekly training results into an adapted next week and, at the end of a block, a new plan.

The MVP focuses on training-program progression. It does not attempt to ingest wearables or become a general health-data platform.

## MVP user

A private, self-coached user or one coach managing a small number of clients. Product access uses one shared credential for the MVP; there are no client accounts, roles, invitations, or billing yet.

## In scope

- Maintain a client profile: goals, body composition, reference loads, nutrition, swimming, and schedule preferences.
- Generate or import a multi-week training plan.
- View the current week and record each exercise's performed sets.
- Mark an exercise as skipped and record constrained feedback: `easy`, `hard`, `heavy`, or `light`.
- Complete a week.
- Run a durable workflow that uses the completed week's logs, client profile, active plan, and coaching rules to create the next week's schedule.
- At the end of a plan, generate and activate a new plan from the training history, client profile, coaching rules, and optional coach notes.
- View previous plans and completed weeks.
- Ask the streaming coach chat questions grounded in live client, plan, and week data.
- Capture every workflow LLM call in Braintrust for traces and evaluation.

The production domain shapes are defined in [architecture/domain_model.md](./architecture/domain_model.md).

## Out of scope

- Migrating existing JSON data: the MVP starts fresh.
- Wearable/device integrations, automatic health-data ingestion, or scheduled data sync.
- Individual client login, roles, invitations, or billing.
- A public mobile app.
- Full cross-client exercise analytics.
- Persisting weekly narrative analysis as product data. Analysis is workflow context used to produce the next schedule.

## Core flows

### Start a plan

1. Create or AI-generate a `Plan` from the client profile, coaching rules, and optional coach notes.
2. Activate it and create week 1 from its canonical week template.
3. Retain prior plans and weeks; activating a plan archives the previous active plan.

### Track a week

1. The user views the current in-flight week.
2. For each exercise, they log performed reps and optional performed weight, or mark it skipped.
3. They add one constrained feedback value: `easy`, `hard`, `heavy`, or `light`.
4. They mark days and then the week complete.

### Complete a week

1. The user triggers weekly completion.
2. The durable workflow reads the completed week, active plan, client profile, and coaching rules.
3. The workflow sends every LLM call to the evaluation/observability provider.
4. If plan weeks remain, the workflow creates the next dated week with any adjustments.
5. If the plan is complete, the UI offers plan generation.

### Generate the next plan

1. The coach optionally supplies notes/preferences.
2. The durable workflow summarizes relevant history and profile context.
3. It creates a new `Plan` and canonical week template.
4. It archives the current plan, activates the new plan, and creates its first week.

## MVP success criteria

- The current plan and in-flight week always come from one live database source of truth.
- A completed week is retained and cannot be silently overwritten by later plan changes.
- The next week is reproducible from recorded logs, client context, coaching rules, and workflow inputs.
- A failed workflow is visible and retryable without corrupting plan or week state.
- Every workflow LLM call has a Braintrust trace; workflow product data does not store LLM trace payloads.
- The browser never talks directly to the local workflow process or D1.

## Delivery sequence / Roadmap

1. Establish the monorepo, D1 schema, internal API boundary, and local workflow runtime.
2. Deleiver client profile with settings and preferences around the plan.
3. Deliver plan creation, and current-week tracking.
4. Deliver weekly completion and next-week generation.
5. Deliver plan-end generation.
6. Add history views and harden workflow/eval coverage.

### Open point for later implementation

- Re-implement streaming coach chat against live data.
