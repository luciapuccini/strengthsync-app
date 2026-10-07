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
    502: badGateway,
  },
});

export function accountRoutes(
  db: Db,
  management: ManagementClient,
): OpenAPIHono<{ Variables: AuthVariables }> {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>({ defaultHook });

  app.openapi(deleteAccountRoute, async (c) => {
    await deleteAccount(db, management, c.get('clientId'));
    return c.body(null, 204);
  });

  return app;
}
