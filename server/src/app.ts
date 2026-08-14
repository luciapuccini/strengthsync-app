import { OpenAPIHono } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';

import { RepoError, type Db } from './db/index.ts';

import { errorResponse, repoErrorResponse } from './lib/errors.ts';
import { requireSession } from './lib/session.ts';
import { defaultHook } from './lib/validation-error.ts';
import { authRoutes } from './routes/auth/endpoints.ts';
import { clientRoutes } from './routes/clients/endpoints.ts';
import { healthRoutes } from './routes/health.ts';
import { onboardingRoutes } from './routes/onboarding/endpoints.ts';
import { planRoutes } from './routes/plans/endpoints.ts';
import { weekRoutes } from './routes/weeks/endpoints.ts';
import { cfWorkflowRoutes } from './routes/wf/endpoints.ts';

export type AppConfig = {
  db: Db;
  /** Signs session JWTs (`lib/session-token.ts`). */
  sessionSecret: string;
};

/** The document builder in `scripts/gen-openapi.ts` needs the OpenAPIHono type. */
export function createApp(config: AppConfig): OpenAPIHono {
  const app = new OpenAPIHono({ defaultHook });

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      // Hono rejects a syntactically malformed JSON body before any validator
      // runs, with a plain-text body. Keep every 400 in the API's envelope so
      // the UI's error handling (client/src/api/errors.ts) can read it.
      if (err.status === 400) {
        return errorResponse(c, 400, 'invalid_input', err.message);
      }
      // Anything else hono raised itself.
      return err.getResponse();
    }
    if (err instanceof RepoError) return repoErrorResponse(c, err);
    console.error('[api] unhandled error', err);
    return errorResponse(c, 500, 'internal_error', 'internal error');
  });

  // Unauthenticated liveness (docs/architecture/api_contracts.md).
  app.route('/', healthRoutes());

  // Registration and sign-in, outside /api because they mint the cookie the
  // guard below checks.
  app.route('/auth', authRoutes(config.db, config.sessionSecret));

  // The session cookie is the only way into the API, in every environment.
  // There is deliberately no development exemption: a guard that is off while
  // the code is being written is a guard nobody tests.
  app.use('/api/*', requireSession(config.sessionSecret));
  app.route('/api', clientRoutes(config.db));
  app.route('/api', onboardingRoutes(config.db));
  app.route('/api', planRoutes(config.db));
  app.route('/api', weekRoutes(config.db));
  app.route('/wf', cfWorkflowRoutes());

  return app;
}
