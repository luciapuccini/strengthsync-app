import { z } from '@hono/zod-openapi';

/** Workflow trigger shape. See `routes/clients/schemas.ts` on rebuilding. */

export const CompleteWeekStartedSchema = z
  .object({
    instanceId: z.string().min(1),
    details: z.looseObject({}),
  })
  .openapi('CompleteWeekStarted');
