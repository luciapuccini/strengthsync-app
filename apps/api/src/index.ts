import { createDb } from "@strengthsync/db";

import { createApp } from "./app.ts";
import type { Env } from "./env.ts";

export { StrengthsyncWorkflow } from "./workflows/strengthsync-workflow.ts";

/**
 * Worker entry: the only browser-facing backend (public REST + workflow
 * proxy) and the internal data-command surface for the workflow worker.
 * See docs/architecture/api_contracts.md.
 */
export default {
  fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Response | Promise<Response> {
    const app = createApp({
      db: createDb(env.DB),
      basicAuth: {
        username: env.BASIC_AUTH_USERNAME,
        password: env.BASIC_AUTH_PASSWORD,
      },
      internalServiceSecret: env.INTERNAL_API_SERVICE_SECRET,
      workflowApi:
        env.WORKFLOW_API_URL && env.WORKFLOW_SERVICE_SECRET
          ? {
              baseUrl: env.WORKFLOW_API_URL,
              serviceSecret: env.WORKFLOW_SERVICE_SECRET,
            }
          : undefined,
    });
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
