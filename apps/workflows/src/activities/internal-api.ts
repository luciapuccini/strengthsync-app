import { z } from 'zod'

import {
  ActivateGeneratedPlanCommandSchema,
  PlanGenerationContextSchema,
  type ActivateGeneratedPlanCommand,
  type PlanGenerationContext,
} from '@strengthsync/domain/contracts'
import { PlanSchema, WeekSchema, type Plan, type Week } from '@strengthsync/domain/model'

import { createInternalRequest, type InternalRequest } from '../internal-request.ts'

export type { InternalRequest }
export { InternalApiError, createInternalRequest } from '../internal-request.ts'

/**
 * Narrow internal-API surface used by plan-generation activities.
 * See docs/architecture/api_contracts.md.
 */

export type InternalApiClient = {
  getPlanGenerationContext(clientId: string): Promise<PlanGenerationContext>
  activateGeneratedPlan(
    clientId: string,
    command: ActivateGeneratedPlanCommand,
  ): Promise<{ plan: Plan; first_week: Week }>
}

const ActivateGeneratedResultSchema = z.object({
  plan: PlanSchema,
  first_week: WeekSchema,
})

export function createInternalApiClient(
  request: InternalRequest = createInternalRequest(),
): InternalApiClient {
  return {
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
