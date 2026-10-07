import { z } from '@hono/zod-openapi';

export const CompleteWeekStartedSchema = z
  .object({
    instanceId: z.string().min(1),
    details: z.looseObject({}),
  })
  .openapi('CompleteWeekStarted');

export const WeeklyProgressionStatusSchema = z
  .object({ status: z.enum(['running', 'complete', 'failed']) })
  .openapi('WeeklyProgressionStatus');
