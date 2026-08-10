# Retired: workflow tunnel

The Cloudflare Tunnel + two-service-secret model was the bridge between the Cloudflare Worker and the local Temporal worker (`apps/workflows`). The Cloudflare Workflows migration removed both processes: the workflow now runs **inside** `apps/api` with the D1 binding, so there is no tunnel, no loopback service, no `WORKFLOW_*` / `INTERNAL_API_SERVICE_SECRET` handshake.

- The two secrets (`WORKFLOW_SERVICE_SECRET`, `INTERNAL_API_SERVICE_SECRET`) no longer exist in the new start path.
- Workflow start is `POST /wf/complete-week` on the Worker itself.
- Data access is direct via `createDb(this.env.DB)`.

See [stack.md](../stack.md) and [api_contracts.md](../api_contracts.md) for the current design. This file is retained only for historical context from the Temporal era.