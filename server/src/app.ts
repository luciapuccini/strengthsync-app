import { OpenAPIHono } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';

import { RepoError, type Db } from './db/index.ts';

import { requireAuth, type TokenVerifier } from './lib/auth.ts';
import { errorResponse, repoErrorResponse } from './lib/errors.ts';
import type { ManagementClient } from './lib/management.ts';
import { defaultHook } from './lib/validation-error.ts';
import { clientRoutes } from './routes/clients/endpoints.ts';
import { healthRoutes } from './routes/health.ts';
import { ingestRoutes } from './routes/ingest.ts';
import { onboardingRoutes } from './routes/onboarding/endpoints.ts';
import { planRoutes } from './routes/plans/endpoints.ts';
import { weekRoutes } from './routes/weeks/endpoints.ts';
import { cfWorkflowRoutes } from './routes/wf/endpoints.ts';

export type AppConfig = {
  db: Db;
  /**
   * Turns a bearer token into a subject, or refuses it.
   *
   * Injected rather than built here, for the same reason `db` is: this module
   * knows nothing about the environment, and reading an issuer or a JWKS URL out
   * of it would be the first time it did. `index.ts` builds the real one;
   * the suite passes a stub, which is what keeps it offline and fast.
   */
  verifyToken: TokenVerifier;
  /** The Auth0 Management API. Built in `index.ts`, stubbed by the suite. */
  management: ManagementClient;
  /**
   * What `/ingest/*` forwards with. Only tests pass this; in the Worker the
   * global `fetch` is the right answer and the proxy has no other dependency.
   */
  ingestFetch?: typeof fetch;
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

  // A transparent pipe to PostHog, deliberately not an API route: it is
  // mounted as a plain hono app so it stays out of the generated OpenAPI
  // document, which describes the contract the client is typed against.
  app.route('/', ingestRoutes(config.ingestFetch));

  // A verified bearer token is the only way into the API, in every environment.
  // There is deliberately no development exemption: a guard that is off while
  // the code is being written is a guard nobody tests. Identity is minted by
  // Auth0 now, not here, so there are no unauthenticated routes left to mount
  // above this line.
  app.use(
    '/api/*',
    requireAuth({
      db: config.db,
      verifyToken: config.verifyToken,
      management: config.management,
    }),
  );
  app.route('/api', clientRoutes(config.db));
  app.route('/api', onboardingRoutes(config.db));
  app.route('/api', planRoutes(config.db));
  app.route('/api', weekRoutes(config.db));
  app.route('/api', cfWorkflowRoutes());

  return app;
}
