import { createDb } from './db/index.ts';

import { createApp } from './app.ts';
import type { Env } from './env.ts';
import { createTokenVerifier } from './lib/auth.ts';
import { createManagementClient } from './lib/management.ts';

export { StrengthsyncWorkflow } from './workflows/strengthsync-workflow.ts';

/**
 * Worker entry: public REST API + Cloudflare workflow trigger.
 * See docs/architecture/api_contracts.md.
 *
 * The only module that reads the environment. Everything below it receives
 * collaborators already built, which is what lets the suite run the whole app
 * with no configuration and no network.
 *
 * Both collaborators are rebuilt per request because a Worker isolate is not
 * guaranteed to outlive one. Their caches — the JWKS key set and the M2M token —
 * therefore help exactly as much as the isolate is reused, which under load is
 * the case that matters and on a cold start is the case that cannot be helped.
 */
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    const app = createApp({
      db: createDb(env.DB),
      verifyToken: createTokenVerifier({
        issuer: env.AUTH0_ISSUER,
        audience: env.AUTH0_AUDIENCE,
        jwksUri: env.AUTH0_JWKS_URI,
      }),
      management: createManagementClient({
        issuerDomain: env.AUTH0_ISSUER_DOMAIN,
        tenantDomain: env.AUTH0_TENANT_DOMAIN,
        clientId: env.AUTH0_M2M_CLIENT_ID,
        clientSecret: env.AUTH0_M2M_CLIENT_SECRET,
      }),
    });
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
