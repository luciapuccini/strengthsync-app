import { createDb } from './db/index.ts';

import { createApp } from './app.ts';
import type { Env } from './env.ts';
import { createTokenVerifier } from './lib/auth.ts';
import { createManagementClient } from './lib/management.ts';

export { StrengthsyncWorkflow } from './workflows/strengthsync-workflow.ts';

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
