import { OpenAPIHono, createRoute } from '@hono/zod-openapi';

import type { Db } from '../../db/index.ts';

import { deleteAccount } from '../../lib/account-deletion.ts';
import type { AuthVariables } from '../../lib/auth.ts';
import type { ManagementClient } from '../../lib/management.ts';
import { defaultHook } from '../../lib/validation-error.ts';
import { badGateway, unauthorized } from '../shared.ts';

const deleteAccountRoute = createRoute({
  method: 'delete',
  path: '/account',
  summary: 'Delete the signed-in athlete and all of their training data',
  responses: {
    204: { description: 'Account and training data deleted' },
    401: unauthorized,
    // A failed Auth0 deletion is the one clean abort: nothing local was touched
    // and the athlete still has a working account, so this is retryable and is
    // declared rather than left to fall out of `app.onError` as a 500.
    502: badGateway,
  },
});

/**
 * Account deletion. See docs/architecture/auth.md.
 *
 * Its own route area rather than a sixth handler in `clients/endpoints.ts`,
 * because it is the only route that needs the Management API — mounting it here
 * keeps that dependency out of the signature of the routes that do not.
 *
 * There is deliberately nothing in this handler except the call. The ordering,
 * the reason for the ordering and the partial-failure semantics all live in
 * `lib/account-deletion.ts`, where they are the module's whole value; a route
 * that inlined them would be the one place nobody looks for a decision.
 *
 * No body and no path parameter: the athlete comes from the verified token, so
 * this request cannot name anyone else. "Delete someone else's account" is not
 * a request the API can express.
 */
export function accountRoutes(
  db: Db,
  management: ManagementClient,
): OpenAPIHono<{ Variables: AuthVariables }> {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>({ defaultHook });

  // No 404 for an athlete whose rows are already gone. Deleting nothing is the
  // desired end state reached early, and the guard has already refused anyone
  // whose identity no longer resolves — so by the time this runs, the only way
  // to find nothing is to have succeeded before.
  app.openapi(deleteAccountRoute, async (c) => {
    await deleteAccount(db, management, c.get('clientId'));
    return c.body(null, 204);
  });

  return app;
}
