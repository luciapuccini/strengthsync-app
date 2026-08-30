import { z } from '@hono/zod-openapi';

import { PlanDaySchema, PlanSchema, PlannedExerciseSchema } from '../../domain/model/index.ts';
import { GeneratedPlanInputSchema } from '../../domain/workflow.ts';
import { uuidParam } from '../shared.ts';
import { DayTypeSchema } from '../weeks/schemas.ts';

/**
 * HTTP shapes for the plans area. See `routes/clients/schemas.ts` on rebuilding.
 *
 * `PlannedExercise` and `PlanDay` are registered as components because
 * `client/src/api/types.ts` aliases them by name, not because a route returns
 * them directly.
 */

const PlannedExercise = z.object(PlannedExerciseSchema.shape).openapi('PlannedExercise');
const PlanDay = z
  .object({ ...PlanDaySchema.shape, type: DayTypeSchema, exercises: z.array(PlannedExercise) })
  .openapi('PlanDay');

const Plan = z.object({ ...PlanSchema.shape, week_template: z.array(PlanDay) }).openapi('Plan');

export const PlanResponseSchema = z.object({ plan: Plan }).openapi('PlanResponse');

/**
 * What first-plan generation writes to its event stream, one JSON object per
 * SSE frame. Semantic events, server-diffed: a snapshot's schema would be a
 * deeply-partial plan, optional at every level, which documents nothing and
 * costs a resend of the whole growing plan on every delta.
 *
 * `meta` borrows the two fields from the generated-plan shape rather than
 * restating them, the same bridging the response schemas above do — the stream
 * describes that object as it is written.
 *
 * `ready` carries identifiers only. The browser refetches from the database
 * once the plan is saved, so shipping the plan here would create a second
 * rendering path fed by unvalidated stream data.
 */
const PlanStreamMetaEvent = z.object({
  type: z.literal('meta'),
  label: GeneratedPlanInputSchema.shape.label,
  total_weeks: GeneratedPlanInputSchema.shape.total_weeks,
});

const PlanStreamReadyEvent = z.object({
  type: z.literal('ready'),
  plan_id: z.uuid(),
  first_week_id: z.uuid(),
});

export const PlanStreamEventSchema = z
  .discriminatedUnion('type', [PlanStreamMetaEvent, PlanStreamReadyEvent])
  .openapi('PlanStreamEvent');

export type PlanStreamEvent = z.infer<typeof PlanStreamEventSchema>;

/** The plan id alone: the athlete comes from the session, never from the path. */
export const PlanIdParamSchema = z.object({ planId: uuidParam('planId') });
