import { OpenAPIHono } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';

import { RepoError, type Db } from './db/index.ts';

import { requireAuth, type TokenVerifier } from './lib/auth.ts';
import { errorResponse, repoErrorResponse } from './lib/errors.ts';
import { ManagementError, type ManagementClient } from './lib/management.ts';
import { defaultHook } from './lib/validation-error.ts';
import { accountRoutes } from './routes/account/endpoints.ts';
import { clientRoutes } from './routes/clients/endpoints.ts';
import { healthRoutes } from './routes/health.ts';
import { ingestRoutes } from './routes/ingest.ts';
import { onboardingRoutes } from './routes/onboarding/endpoints.ts';
import { planRoutes } from './routes/plans/endpoints.ts';
import { weekRoutes } from './routes/weeks/endpoints.ts';
import { cfWorkflowRoutes } from './routes/wf/endpoints.ts';

export type AppConfig = {
  db: Db;
  verifyToken: TokenVerifier;
  management: ManagementClient;
  ingestFetch?: typeof fetch;
};

export function createApp(config: AppConfig): OpenAPIHono {
  const app = new OpenAPIHono({ defaultHook });

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      if (err.status === 400) {
        return errorResponse(c, 400, 'invalid_input', err.message);
      }
      return err.getResponse();
    }
    if (err instanceof RepoError) return repoErrorResponse(c, err);
    if (err instanceof ManagementError) {
      console.error('[api] management API error', err.status, err.message);
      return errorResponse(c, 502, 'provider_unavailable', 'identity provider request failed');
    }
    console.error('[api] unhandled error', err);
    return errorResponse(c, 500, 'internal_error', 'internal error');
  });

  app.route('/', healthRoutes());

  app.route('/', ingestRoutes(config.ingestFetch));

  app.use(
    '/api/*',
    requireAuth({
      db: config.db,
      verifyToken: config.verifyToken,
      management: config.management,
    }),
  );
  app.route('/api', accountRoutes(config.db, config.management));
  app.route('/api', clientRoutes(config.db));
  app.route('/api', onboardingRoutes(config.db));
  app.route('/api', planRoutes(config.db));
  app.route('/api', weekRoutes(config.db));
  app.route('/api', cfWorkflowRoutes());

  return app;
}
