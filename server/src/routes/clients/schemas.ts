import { z } from '@hono/zod-openapi';

import {
  ClientProfileSchema,
  ClientProfileWriteSchema,
  ClientSchema,
  UnitPreferenceSchema,
} from '../../domain/model/index.ts';

export const UpdateClientSchema = z
  .object({ unit_preference: z.enum(UnitPreferenceSchema.options) })
  .openapi('UpdateClient');

export const UpdateClientProfileSchema = z
  .object(ClientProfileWriteSchema.shape)
  .openapi('UpdateClientProfile');

const Client = z.object(ClientSchema.shape).openapi('Client');
const ClientProfile = z.object(ClientProfileSchema.shape).openapi('ClientProfile');

export const ClientResponseSchema = z.object({ client: Client }).openapi('ClientResponse');
export const ClientProfileResponseSchema = z
  .object({ profile: ClientProfile })
  .openapi('ClientProfileResponse');
