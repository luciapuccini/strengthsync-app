import { z } from '@hono/zod-openapi';

import { PlanDaySchema, PlanSchema, PlannedExerciseSchema } from '../../domain/model/index.ts';
import { uuidParam } from '../shared.ts';
import { DayTypeSchema, Week } from '../weeks/schemas.ts';

const PlannedExercise = z.object(PlannedExerciseSchema.shape).openapi('PlannedExercise');
const PlanDay = z
  .object({ ...PlanDaySchema.shape, type: DayTypeSchema, exercises: z.array(PlannedExercise) })
  .openapi('PlanDay');

const Plan = z.object({ ...PlanSchema.shape, week_template: z.array(PlanDay) }).openapi('Plan');

export const PlanResponseSchema = z.object({ plan: Plan }).openapi('PlanResponse');

export const GeneratePlanResponseSchema = z
  .object({ plan: Plan, first_week: Week })
  .openapi('GeneratePlanResponse');

export const PlanIdParamSchema = z.object({ planId: uuidParam('planId') });
