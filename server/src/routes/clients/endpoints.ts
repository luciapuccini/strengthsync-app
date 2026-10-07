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

export function clientRoutes(db: Db): OpenAPIHono<{ Variables: AuthVariables }> {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>({ defaultHook });

  app.openapi(getMeRoute, async (c) => {
    const client = await getClient(db, c.get('clientId'));
    if (!client) {
      return c.json({ error: { code: 'client_not_found', message: 'client not found' } }, 404);
    }
    return c.json({ client }, 200);
  });

  app.openapi(patchMeRoute, async (c) => {
    const { unit_preference } = c.req.valid('json');
    const client = await updateUnitPreference(db, c.get('clientId'), unit_preference);
    if (!client) {
      return c.json({ error: { code: 'client_not_found', message: 'client not found' } }, 404);
    }
    return c.json({ client }, 200);
  });

  app.openapi(getMyProfileRoute, async (c) => {
    const profile = await findProfile(db, c.get('clientId'));
    if (!profile) {
      return c.json({ error: { code: 'profile_not_found', message: 'no profile yet' } }, 404);
    }
    return c.json({ profile }, 200);
  });

  app.openapi(putMyProfileRoute, async (c) => {
    const clientId = c.get('clientId');
    if (!(await getClient(db, clientId))) {
      return c.json({ error: { code: 'client_not_found', message: 'client not found' } }, 404);
    }
    const profile = await upsertProfile(db, clientId, c.req.valid('json'));
    return c.json({ profile }, 200);
  });

  return app;
}
