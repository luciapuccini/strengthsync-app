import { createDb } from './db/index.ts';

import { createApp } from './app.ts';
import type { Env } from './env.ts';

export { StrengthsyncWorkflow } from './workflows/strengthsync-workflow.ts';

/**
 * Worker entry: public REST API + Cloudflare workflow trigger.
 * See docs/architecture/api_contracts.md.
 */
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    const app = createApp({
      db: createDb(env.DB),
      sessionSecret: env.SESSION_JWT_SECRET,
    });
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
