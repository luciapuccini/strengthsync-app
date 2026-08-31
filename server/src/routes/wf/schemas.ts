import { z } from '@hono/zod-openapi';
import type { WorkflowInstanceStatus } from 'cloudflare:workers';

/** Workflow trigger shape. See `routes/clients/schemas.ts` on rebuilding. */

const WORKFLOW_STATUSES = [
  'queued',
  'running',
  'paused',
  'errored',
  'terminated',
  'complete',
  'waiting',
  'waitingForPause',
  'unknown',
] as const satisfies readonly WorkflowInstanceStatus[];

export const WorkflowStatusSchema = z.enum(WORKFLOW_STATUSES).openapi('WorkflowStatus');

export const CompleteWeekStartedSchema = z
  .object({
    instanceId: z.string().min(1),
    status: WorkflowStatusSchema,
  })
  .openapi('CompleteWeekStarted');

export const TurnoverStatusSchema = z
  .object({ status: WorkflowStatusSchema })
  .openapi('TurnoverStatus');
