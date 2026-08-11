import { OpenAPIHono, createRoute } from '@hono/zod-openapi'

import {
  createClient,
  getClient,
  getProfile,
  listClients,
  upsertProfile,
  type Db,
} from '../../db/index.ts'

import { defaultHook } from '../../lib/validation-error.ts'

import {
  ApiErrorSchema,
  ClientIdParamSchema,
  ClientListResponseSchema,
  ClientProfileResponseSchema,
  ClientResponseSchema,
  CreateClientInput,
  UpdateClientProfile,
} from './schemas.ts'

const json = <S>(description: string, schema: S) => ({
  description,
  content: { 'application/json': { schema } },
})

const unauthorized = json('Missing or invalid credentials', ApiErrorSchema)
const invalidInput = json('Invalid input', ApiErrorSchema)
const notFound = json('Not found', ApiErrorSchema)

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
  request: { body: { content: { 'application/json': { schema: CreateClientInput } } } },
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
    body: { content: { 'application/json': { schema: UpdateClientProfile } } },
  },
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
 */
export function clientRoutes(db: Db): OpenAPIHono {
  const app = new OpenAPIHono({ defaultHook })

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

  return app
}
