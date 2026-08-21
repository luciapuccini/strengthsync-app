import { OpenAPIHono, createRoute } from '@hono/zod-openapi';

import {
  findProfile,
  getClient,
  updateUnitPreference,
  upsertProfile,
  type Db,
} from '../../db/index.ts';

import type { AuthVariables } from '../../lib/auth.ts';
import { defaultHook } from '../../lib/validation-error.ts';
import { invalidInput, json, notFound, unauthorized } from '../shared.ts';

import {
  ClientProfileResponseSchema,
  ClientResponseSchema,
  UpdateClientProfileSchema,
  UpdateClientSchema,
} from './schemas.ts';

const getMeRoute = createRoute({
  method: 'get',
  path: '/me',
  summary: 'Get the signed-in client',
  responses: {
    200: json('The signed-in client', ClientResponseSchema),
    401: unauthorized,
    404: notFound,
  },
});

const patchMeRoute = createRoute({
  method: 'patch',
  path: '/me',
  summary: "Update the signed-in client's settings",
  request: { body: { content: { 'application/json': { schema: UpdateClientSchema } } } },
  responses: {
    200: json('The updated client', ClientResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
});

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

  /**
   * Replaces the deleted `/auth/session`. Its remaining job is the internal
   * athlete id: the browser needs one on a cold load to identify the person to
   * product analytics, and to key the local week draft. Nothing about
   * authentication is left for it to report — by the time this handler runs the
   * guard has already decided, so reaching it at all is the answer.
   *
   * This is also the one route that puts the `Client` schema into the generated
   * contract. Between issue 011 and here, no route returned one, so the
   * component vanished from `openapi.json` and `client/src/api/types.ts` carried
   * a hand-written copy.
   */
  app.openapi(getMeRoute, async (c) => {
    const client = await getClient(db, c.get('clientId'));
    // A token outlives the row it names, so a deleted athlete can still present
    // a valid one.
    if (!client) {
      return c.json({ error: { code: 'client_not_found', message: 'client not found' } }, 404);
    }
    return c.json({ client }, 200);
  });

  /**
   * The one writer of `unit_preference`, shared by the Account toggle and the
   * onboarding toggle so the two cannot drift apart. It answers with the whole
   * client rather than the field, so the session store can adopt the response
   * directly instead of refetching.
   */
  app.openapi(patchMeRoute, async (c) => {
    const { unit_preference } = c.req.valid('json');
    const client = await updateUnitPreference(db, c.get('clientId'), unit_preference);
    // A token outlives the row it names, so a deleted athlete can still present
    // a valid one.
    if (!client) {
      return c.json({ error: { code: 'client_not_found', message: 'client not found' } }, 404);
    }
    return c.json({ client }, 200);
  });

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
