import { z } from '@hono/zod-openapi'

/** Workflow trigger shapes. See `routes/clients/schemas.ts` on rebuilding. */

export const CompleteWeekInputSchema = z
  .object({ clientId: z.uuid() })
  .openapi('CompleteWeekInput')

export const CompleteWeekStartedSchema = z
  .object({
    instanceId: z.string().min(1),
    details: z.looseObject({}),
  })
  .openapi('CompleteWeekStarted')
