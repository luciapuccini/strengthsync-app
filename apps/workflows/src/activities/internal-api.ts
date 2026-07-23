import { z } from 'zod'

import {
  ActivateGeneratedPlanCommandSchema,
  CompleteWeekCommandSchema,
  CreateNextWeekCommandSchema,
  PlanGenerationContextSchema,
  WeeklyContextSchema,
  type ActivateGeneratedPlanCommand,
  type CompleteWeekCommand,
  type CreateNextWeekCommand,
  type PlanGenerationContext,
  type WeeklyContext,
} from '@strengthsync/domain/contracts'
import { PlanSchema, WeekSchema, type Plan, type Week } from '@strengthsync/domain/model'

import { createInternalRequest, type InternalRequest } from '../internal-request.ts'

export type { InternalRequest }
export { InternalApiError, createInternalRequest } from '../internal-request.ts'

/**
 * Narrow internal-API surface used by workflow activities.
 * See docs/architecture/api_contracts.md.
 */

export type InternalApiClient = {
  getWeeklyContext(clientId: string, weekId: string): Promise<WeeklyContext>
  completeWeek(clientId: string, weekId: string, command: CompleteWeekCommand): Promise<Week>
  createNextWeek(clientId: string, command: CreateNextWeekCommand): Promise<Week>
  getPlanGenerationContext(clientId: string): Promise<PlanGenerationContext>
  activateGeneratedPlan(
    clientId: string,
    command: ActivateGeneratedPlanCommand,
  ): Promise<{ plan: Plan; first_week: Week }>
}

const WeekResultSchema = z.object({ week: WeekSchema })
const ActivateGeneratedResultSchema = z.object({
  plan: PlanSchema,
  first_week: WeekSchema,
})

export function createInternalApiClient(
  request: InternalRequest = createInternalRequest(),
): InternalApiClient {
  return {
    getWeeklyContext(clientId, weekId) {
      return request(
        'GET',
        `/internal/clients/${clientId}/weekly-context?weekId=${encodeURIComponent(weekId)}`,
        WeeklyContextSchema,
      )
    },
    completeWeek(clientId, weekId, command) {
      const body = CompleteWeekCommandSchema.parse(command)
      return request(
        'POST',
        `/internal/clients/${clientId}/weeks/${weekId}/complete`,
        WeekResultSchema,
        body,
      ).then((result) => result.week)
    },
    createNextWeek(clientId, command) {
      const body = CreateNextWeekCommandSchema.parse(command)
      return request(
        'POST',
        `/internal/clients/${clientId}/weeks/next`,
        WeekResultSchema,
        body,
      ).then((result) => result.week)
    },
    getPlanGenerationContext(clientId) {
      return request(
        'GET',
        `/internal/clients/${clientId}/plan-generation-context`,
        PlanGenerationContextSchema,
      )
    },
    activateGeneratedPlan(clientId, command) {
      const body = ActivateGeneratedPlanCommandSchema.parse(command)
      return request(
        'POST',
        `/internal/clients/${clientId}/plans/activate-generated`,
        ActivateGeneratedResultSchema,
        body,
      )
    },
  }
}
