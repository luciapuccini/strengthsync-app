# Workflow operations

Operations for the MVP's durable workflow. The workflow is a Cloudflare Worker Workflow inside `server` (bound as `STRENGTHSYNC_WORKFLOW`, entrypoint `StrengthsyncWorkflow` in `server/src/workflows/strengthsync-workflow.ts`). There is no local worker process, Docker Compose project, Cloudflare Tunnel, or Temporal deployment to operate.

## Deployment

The workflow ships with `server`:

1. Deploy `server` and D1 migrations through CI/CD (see [stack.md](../architecture/stack.md) CI/CD).
2. `wrangler deploy` uploads the Worker including the workflow entrypoint and binding; no separate rollout step exists.

Deploy order matters: apply D1 schema migrations before deploying a workflow version that depends on them.

The deployed host is `app.strengthsync.ai` — a Workers custom domain, so the workflow bindings live on the same Worker as the API.

## Starting and observing runs

- **Start:** `POST /wf/complete-week` with `{ clientId }` creates a new workflow instance and returns its `instanceId` plus the initial `instance.status()` (see [api_contracts.md](../architecture/api_contracts.md)).
- **Status:** query a started instance through the Cloudflare Workers Workflow API. Cloudflare Workers Logs (`observability.logs.invocation_logs` in `wrangler.jsonc`) captures per-invocation logs including `console.*` from workflow steps.
- **Retries:** per-step retries are defined in the workflow (`step.do` retry config) — see the retry table in [workflows.md](../architecture/workflows.md).

## Failure behavior and recovery

| Failure | User impact | Recovery |
| --- | --- | --- |
| A step fails after retries | The workflow instance finishes failed; product state written before the failure is preserved | Fix the cause in code, deploy, then re-trigger a new instance |
| Worker deployment broken | Workflow starts/status unavailable | Roll back or fix deploy; workflows run again once the Worker is healthy |
| D1 unavailable | Steps fail or retry | Restore Cloudflare D1; re-run the workflow |
| Stuck workflow appears | Workflow may be waiting on step retries | Inspect Workers Logs / instance status; terminate and restart via the Workflow API if appropriate |

Cloudflare retains workflow execution state. Durable step recording means a failed instance can be re-run from its start without duplicating completed writes — the workflow's steps and the product writes they perform are designed to be re-runnable.

## Logging and observability

- Cloudflare: Worker/D1 request logs and operational telemetry; workflow invocation logs.
- Workflow binding: instance status, step retries, and failures via the Workers Workflow API.
- Model traces/evals: Braintrust — the recorder was deleted with `services/agent` and will be defined fresh inside `server/src/agent` when tracing returns (see [evals.md](../architecture/evals.md)).

Do not log profile payloads or secrets unnecessarily. Never send secrets to traces or logs.

## MVP decision

- No always-on service requirement: the workflow runs on Cloudflare with the Worker. There is no weekly local-machine spin-up step; `wrangler deploy` ships everything needed.