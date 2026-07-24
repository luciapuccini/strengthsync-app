import { ApplicationFailure } from '@temporalio/common'

import {
  createOpenAiRuntime,
  generatePlan,
  summarizeHistory,
  summarizeProfile,
} from '@strengthsync/agent'
import { NO_PRIOR_HISTORY_SUMMARY } from '@strengthsync/domain/coach'
import type { GeneratedPlanInput, PlanGenerationContext } from '@strengthsync/domain/contracts'

import { OPENAI_API_KEY, OPENAI_MODEL } from '../config.ts'
import { createLlmRecorder } from '../observability/llm-call-recorder.ts'
import { createInternalApiClient, InternalApiError } from './internal-api.ts'

const internalApi = createInternalApiClient()
const runtime = createOpenAiRuntime(OPENAI_API_KEY)
const recorder = createLlmRecorder()

export async function loadPlanGenerationContext(input: {
  client_id: string
}): Promise<PlanGenerationContext> {
  return withInternalErrors(() => internalApi.getPlanGenerationContext(input.client_id))
}

export async function summarizePlanProfile(input: {
  workflow_id: string
  client_id: string
  context: PlanGenerationContext
}): Promise<string> {
  const result = await summarizeProfile(
    runtime,
    {
      workflow_id: input.workflow_id,
      client_id: input.client_id,
      step: 'summarize_profile',
      recorder,
      model: OPENAI_MODEL,
    },
    { profile: input.context.profile, coaching_rules: input.context.coaching_rules },
  )
  return result.summary
}

export async function summarizePlanHistory(input: {
  workflow_id: string
  client_id: string
  context: PlanGenerationContext
}): Promise<string> {
  if (!input.context.active_plan) return NO_PRIOR_HISTORY_SUMMARY
  const result = await summarizeHistory(
    runtime,
    {
      workflow_id: input.workflow_id,
      client_id: input.client_id,
      step: 'summarize_history',
      recorder,
      model: OPENAI_MODEL,
    },
    {
      active_plan: input.context.active_plan,
      completed_weeks: input.context.completed_weeks,
      coaching_rules: input.context.coaching_rules,
    },
  )
  return result.summary
}

export async function generatePlanDocument(input: {
  workflow_id: string
  client_id: string
  context: PlanGenerationContext
  profile_summary: string
  history_summary: string
  notes?: string
}): Promise<GeneratedPlanInput> {
  return generatePlan(
    runtime,
    {
      workflow_id: input.workflow_id,
      client_id: input.client_id,
      step: 'generate_plan',
      recorder,
      model: OPENAI_MODEL,
    },
    {
      profile_summary: input.profile_summary,
      history_summary: input.history_summary,
      previous_plan: input.context.active_plan,
      coaching_rules: input.context.coaching_rules,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  )
}

export async function activateGeneratedPlan(input: {
  workflow_id: string
  client_id: string
  plan: GeneratedPlanInput
}): Promise<{ plan_id: string; first_week_id: string }> {
  return withInternalErrors(async () => {
    const result = await internalApi.activateGeneratedPlan(input.client_id, {
      workflow_id: input.workflow_id,
      plan: input.plan,
    })
    return { plan_id: result.plan.id, first_week_id: result.first_week.id }
  })
}

async function withInternalErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (err instanceof InternalApiError && !err.retryable) {
      throw ApplicationFailure.nonRetryable(err.message, err.code)
    }
    throw err
  }
}
