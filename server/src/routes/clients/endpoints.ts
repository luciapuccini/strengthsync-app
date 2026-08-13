import { OpenAPIHono, createRoute } from '@hono/zod-openapi'

import {
  createClient,
  findProfile,
  getClient,
  getProfile,
  listClients,
  upsertProfile,
  type Db,
} from '../../db/index.ts'

import type { SessionVariables } from '../../lib/session.ts'
import { defaultHook } from '../../lib/validation-error.ts'
import {
  ClientIdParamSchema,
  invalidInput,
  json,
  notFound,
  unauthorized,
} from '../shared.ts'

import {
  ClientListResponseSchema,
  ClientProfileResponseSchema,
  ClientResponseSchema,
  CreateClientInputSchema,
  UpdateClientProfileSchema,
} from './schemas.ts'

const listClientsRoute = createRoute({
  method: 'get',
  path: '/clients',
  summary: 'List clients',
  responses: { 200: json('Clients found', ClientListResponseSchema), 401: unauthorized },
})

const createClientRoute = createRoute({
  method: 'post',
  path: '/clients',
  summary: 'Create a client',
  request: { body: { content: { 'application/json': { schema: CreateClientInputSchema } } } },
  responses: {
    201: json('Client created', ClientResponseSchema),
    400: invalidInput,
    401: unauthorized,
  },
})

const getClientProfileRoute = createRoute({
  method: 'get',
  path: '/clients/{clientId}/profile',
  summary: "Get a client's profile",
  request: { params: ClientIdParamSchema },
  responses: {
    200: json('Profile found', ClientProfileResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
})

const putClientProfileRoute = createRoute({
  method: 'put',
  path: '/clients/{clientId}/profile',
  summary: "Create or replace a client's profile",
  request: {
    params: ClientIdParamSchema,
    body: { content: { 'application/json': { schema: UpdateClientProfileSchema } } },
  },
  responses: {
    200: json('Profile saved', ClientProfileResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
})

const getMyProfileRoute = createRoute({
  method: 'get',
  path: '/me/profile',
  summary: "Get the signed-in client's profile",
  responses: {
    200: json('Profile found', ClientProfileResponseSchema),
    401: unauthorized,
    404: notFound,
  },
})

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
})

/**
 * Public client + profile routes. See docs/architecture/api_contracts.md.
 *
 * Every declared response carries a schema, so the library requires handlers to
 * return a declared status — a bare `Response` will not compile. That is why
 * 404s are built inline here rather than through `lib/errors.ts`.
 *
 * The /me routes take the athlete from the verified session, so there is no id
 * in their paths and no request can name another athlete. They are added
 * alongside the /clients/{clientId} routes rather than replacing them, so the
 * generated types only gain paths and no caller breaks mid-migration; the old
 * ones go in `issues/auth/013`.
 */
export function clientRoutes(db: Db): OpenAPIHono<{ Variables: SessionVariables }> {
  const app = new OpenAPIHono<{ Variables: SessionVariables }>({ defaultHook })

  app.openapi(listClientsRoute, async (c) => c.json({ clients: await listClients(db) }, 200))

  // RepoError propagates to app.ts's onError, which maps it to the envelope.
  app.openapi(createClientRoute, async (c) => {
    const client = await createClient(db, c.req.valid('json'))
    return c.json({ client }, 201)
  })

  app.openapi(getClientProfileRoute, async (c) => {
    const { clientId } = c.req.valid('param')
    const profile = await getProfile(db, clientId)
    if (!profile) {
      return c.json(
        { error: { code: 'profile_not_found', message: `client ${clientId} has no profile` } },
        404,
      )
    }
    return c.json({ profile }, 200)
  })

  app.openapi(putClientProfileRoute, async (c) => {
    const { clientId } = c.req.valid('param')
    if (!(await getClient(db, clientId))) {
      return c.json(
        { error: { code: 'client_not_found', message: `client ${clientId} not found` } },
        404,
      )
    }
    const profile = await upsertProfile(db, clientId, c.req.valid('json'))
    return c.json({ profile }, 200)
  })

  // `findProfile`, not `getProfile`: having no profile yet is ordinary, and the
  // repository note explains why the /clients route above cannot say so.
  app.openapi(getMyProfileRoute, async (c) => {
    const profile = await findProfile(db, c.get('clientId'))
    if (!profile) {
      return c.json(
        { error: { code: 'profile_not_found', message: 'no profile yet' } },
        404,
      )
    }
    return c.json({ profile }, 200)
  })

  app.openapi(putMyProfileRoute, async (c) => {
    const clientId = c.get('clientId')
    // The session outlives the row it names by up to thirty days, so a deleted
    // athlete can still present a valid cookie.
    if (!(await getClient(db, clientId))) {
      return c.json({ error: { code: 'client_not_found', message: 'client not found' } }, 404)
    }
    const profile = await upsertProfile(db, clientId, c.req.valid('json'))
    return c.json({ profile }, 200)
  })

  return app
}
