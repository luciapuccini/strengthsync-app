# `@strengthsync/workflows`

Temporal worker, private workflow-start API, Braintrust LLM tracing, and manual evals.

Secrets load from the repo-root `.dev.vars` (local scripts) or `.env.workflows` (Docker Compose). See [docs/operations/local_worker.md](../../docs/operations/local_worker.md) and [docs/architecture/evals.md](../../docs/architecture/evals.md).

## Runtime

| Command                                              | Purpose                                                 |
| ---------------------------------------------------- | ------------------------------------------------------- |
| `pnpm --filter @strengthsync/workflows dev:api`      | Start the private workflow-start HTTP API (watch mode). |
| `pnpm --filter @strengthsync/workflows dev:worker`   | Start the Temporal worker (watch mode).                 |
| `pnpm --filter @strengthsync/workflows start:api`    | Start the API without watch (container / prod-like).    |
| `pnpm --filter @strengthsync/workflows start:worker` | Start the worker without watch.                         |

## Evals (manual only — not CI)

### `pnpm eval:score`

Runs the **deterministic** `LightProgression` scorer against fixture `sample_output` only. No model calls, no token cost.

```text
pnpm eval:score -- --step generate_next_week
```

### `pnpm eval:replay`

Calls the real agent helpers (`generatePlan` / `generateNextWeek`), logs a Braintrust experiment, and runs scorers (`LightProgression` where applicable + ClosedQA quality). Costs money.

```text
pnpm eval:replay -- --step generate_plan --limit 1
pnpm eval:replay -- --step generate_next_week --limit 1
```

`--limit` caps how many fixtures run. Start with `1`.

## Layout

```text
src/           # API, Temporal worker, activities, Braintrust recorder
evals/         # Fixtures, scorers, Eval() definitions, cli.ts
```
