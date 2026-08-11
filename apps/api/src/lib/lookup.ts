import type { Context } from 'hono'

import { getClient, type Db } from '../db/index.ts'
import type { Client } from '../domain/model/index.ts'

import { errorResponse } from './errors.ts'

/** Fetch the client or return a ready 404 response. */
export async function requireClient(
  db: Db,
  c: Context,
  clientId: string,
): Promise<Client | Response> {
  const client = await getClient(db, clientId)
  if (!client) {
    return errorResponse(c, 404, 'client_not_found', `client ${clientId} not found`)
  }
  return client
}
