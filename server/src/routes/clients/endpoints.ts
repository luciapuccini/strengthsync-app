import { OpenAPIHono, createRoute } from '@hono/zod-openapi';

import { findProfile, getClient, upsertProfile, type Db } from '../../db/index.ts';

import type { AuthVariables } from '../../lib/auth.ts';
import { defaultHook } from '../../lib/validation-error.ts';
import { invalidInput, json, notFound, unauthorized } from '../shared.ts';

import { ClientProfileResponseSchema, UpdateClientProfileSchema } from './schemas.ts';

const getMyProfileRoute = createRoute({
  method: 'get',
  path: '/me/profile',
  summary: "Get the signed-in client's profile",
  responses: {
    200: json('Profile found', ClientProfileResponseSchema),
    401: unauthorized,
    404: notFound,
  },
});

const putMyProfileRoute = createRoute({
  method: 'put',
  path: '/me/profile',
  summary: "Create or replace the signed-in client's profile",
  request: { body: { content: { 'application/json': { schema: UpdateClientProfileSchema } } } },
  responses: {
    200: json('Profile saved', ClientProfileResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
});

/**
 * Profile routes for the signed-in client. See docs/architecture/api_contracts.md.
 *
 * Every declared response carries a schema, so the library requires handlers to
 * return a declared status — a bare `Response` will not compile. That is why
 * 404s are built inline here rather than through `lib/errors.ts`.
 *
 * There is no /clients/{clientId} counterpart any more: the athlete comes from
 * the verified session, so no request can name anyone else. Reading someone
 * else's profile is not a request the API can express.
 */
export function clientRoutes(db: Db): OpenAPIHono<{ Variables: AuthVariables }> {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>({ defaultHook });

  // `findProfile`, not `getProfile`: having no profile yet is ordinary rather
  // than exceptional, so it is a 404 and not a thrown error.
  app.openapi(getMyProfileRoute, async (c) => {
    const profile = await findProfile(db, c.get('clientId'));
    if (!profile) {
      return c.json({ error: { code: 'profile_not_found', message: 'no profile yet' } }, 404);
    }
    return c.json({ profile }, 200);
  });

  app.openapi(putMyProfileRoute, async (c) => {
    const clientId = c.get('clientId');
    // A token outlives the row it names, so a deleted athlete can still
    // present a valid one.
    if (!(await getClient(db, clientId))) {
      return c.json({ error: { code: 'client_not_found', message: 'client not found' } }, 404);
    }
    const profile = await upsertProfile(db, clientId, c.req.valid('json'));
    return c.json({ profile }, 200);
  });

  return app;
}
