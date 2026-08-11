import { z } from '@hono/zod-openapi'

import {
  CreateClientInputSchema,
  UpdateClientProfileSchema,
} from '../../domain/contracts/index.ts'
import { ClientProfileSchema, ClientSchema } from '../../domain/model/index.ts'

/**
 * HTTP shapes for the clients area, registered as OpenAPI components.
 *
 * The `.openapi('Name')` names are the contract: `client/src/api/types.ts`
 * aliases components by name, so these must match the components already in
 * `server/openapi.json` for slice 006's cutover to be a no-op.
 *
 * Why the schemas are rebuilt from `.shape` rather than named in place:
 * `@hono/zod-openapi` adds `.openapi()` by patching `ZodType.prototype`, and
 * Zod 4 copies prototype methods onto each instance at construction. A schema
 * built before this module loads therefore never gains the method, and
 * `domain/model` is reached first through `db/schema.ts` in several entry
 * points. Rebuilding with the `z` exported here constructs after the patch.
 * Keep this in mind if an entity schema ever grows an object-level refinement —
 * `.shape` would drop it. DTOs stop needing this in slice 005, when they are
 * defined in this file rather than imported.
 */

export const ApiErrorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi('ApiError')

export const ClientIdParamSchema = z.object({
  clientId: z.uuid().openapi({ param: { name: 'clientId', in: 'path' } }),
})

export const CreateClientInput = z
  .object(CreateClientInputSchema.shape)
  .openapi('CreateClientInput')
export const UpdateClientProfile = z
  .object(UpdateClientProfileSchema.shape)
  .openapi('UpdateClientProfile')

const Client = z.object(ClientSchema.shape).openapi('Client')
const ClientProfile = z.object(ClientProfileSchema.shape).openapi('ClientProfile')

export const ClientListResponseSchema = z
  .object({ clients: z.array(Client) })
  .openapi('ClientListResponse')
export const ClientResponseSchema = z.object({ client: Client }).openapi('ClientResponse')
export const ClientProfileResponseSchema = z
  .object({ profile: ClientProfile })
  .openapi('ClientProfileResponse')
