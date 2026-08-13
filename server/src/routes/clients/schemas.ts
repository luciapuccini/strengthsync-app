import { z } from '@hono/zod-openapi'

import {
  ClientProfileSchema,
  ClientProfileWriteSchema,
  ClientSchema,
} from '../../domain/model/index.ts'

/**
 * HTTP shapes for the clients area, registered as OpenAPI components.
 *
 * The `.openapi('Name')` names are the contract: `client/src/api/types.ts`
 * aliases components by name, so these must match the components in
 * `server/openapi.json` for slice 006's cutover to be a no-op.
 *
 * Why the schemas are rebuilt from `.shape` rather than named in place:
 * `@hono/zod-openapi` adds `.openapi()` by patching `ZodType.prototype`, and
 * Zod 4 copies prototype methods onto each instance at construction. A schema
 * built before this module loads therefore never gains the method, and
 * `domain/model` is reached first through `db/schema.ts` in several entry
 * points. Rebuilding with the `z` exported here constructs after the patch.
 *
 * `.shape` rebuilding is only safe for schemas with no object-level
 * refinement — it silently drops one. None of these have any; the day-log
 * schemas in `routes/weeks/schemas.ts` do, and are built differently.
 */

export const UpdateClientProfileSchema = z
  .object(ClientProfileWriteSchema.shape)
  .openapi('UpdateClientProfile')

const Client = z.object(ClientSchema.shape).openapi('Client')
const ClientProfile = z.object(ClientProfileSchema.shape).openapi('ClientProfile')

// `Client` reaches the contract through this one response, which sign-up and
// sign-in return. The list shape that used to carry it went with its route.
export const ClientResponseSchema = z.object({ client: Client }).openapi('ClientResponse')
export const ClientProfileResponseSchema = z
  .object({ profile: ClientProfile })
  .openapi('ClientProfileResponse')
