import { Hono } from 'hono'

import { createClient, getProfile, listClients, upsertProfile, type Db } from '../db/index.ts'
import {
  CreateClientInputSchema,
  UpdateClientProfileSchema,
} from '../domain/contracts/index.ts'

import { errorResponse, repoErrorResponse } from '../lib/errors.ts'
import { requireClient } from '../lib/lookup.ts'
import { isResponse, parseBody, parseUuidParam } from '../lib/validate.ts'

/** Public client + profile routes. See docs/architecture/api_contracts.md. */
export function clientRoutes(db: Db): Hono {
  const app = new Hono()

  app.get('/clients', async (c) => c.json({ clients: await listClients(db) }))

  app.post('/clients', async (c) => {
    const input = await parseBody(c, CreateClientInputSchema)
    if (isResponse(input)) return input
    try {
      const client = await createClient(db, input)
      return c.json({ client }, 201)
    } catch (err) {
      return repoErrorResponse(c, err)
    }
  })

  app.get('/clients/:clientId', async (c) => {
    const clientId = parseUuidParam(c, c.req.param('clientId'), 'clientId')
    if (isResponse(clientId)) return clientId
    const client = await requireClient(db, c, clientId)
    if (isResponse(client)) return client
    return c.json({ client })
  })

  app.get('/clients/:clientId/profile', async (c) => {
    const clientId = parseUuidParam(c, c.req.param('clientId'), 'clientId')
    if (isResponse(clientId)) return clientId
    const profile = await getProfile(db, clientId)
    if (!profile) {
      return errorResponse(c, 404, 'profile_not_found', `client ${clientId} has no profile`)
    }
    return c.json({ profile })
  })

  app.put('/clients/:clientId/profile', async (c) => {
    const clientId = parseUuidParam(c, c.req.param('clientId'), 'clientId')
    if (isResponse(clientId)) return clientId
    const client = await requireClient(db, c, clientId)
    if (isResponse(client)) return client
    const input = await parseBody(c, UpdateClientProfileSchema)
    if (isResponse(input)) return input
    const profile = await upsertProfile(db, clientId, input)
    return c.json({ profile })
  })

  return app
}
