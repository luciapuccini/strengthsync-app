import {
  createOpenAiRuntime,
  generateNextWeek,
  generatePlan,
} from '@strengthsync/agent'
import type {
  GenerateNextWeekPromptInput,
  GeneratePlanPromptInput,
  NextWeekSchedule,
} from '@strengthsync/domain/coach'
import type { GeneratedPlanInput } from '@strengthsync/domain/contracts'

import { OPENAI_API_KEY, OPENAI_MODEL } from '../src/config.ts'
import { createLlmRecorder } from '../src/observability/llm-call-recorder.ts'

/**
 * Non-Temporal eval entrypoint — same agent helpers as production activities.
 */

export async function runGeneratePlan(
  input: GeneratePlanPromptInput,
): Promise<GeneratedPlanInput> {
  const runtime = createOpenAiRuntime(OPENAI_API_KEY)
  const recorder = createLlmRecorder()
  return generatePlan(
    runtime,
    {
      workflow_id: 'eval:generate_plan',
      client_id: 'eval-client',
      step: 'generate_plan',
      recorder,
      model: OPENAI_MODEL,
    },
    input,
  )
}

export async function runGenerateNextWeek(
  input: GenerateNextWeekPromptInput,
): Promise<NextWeekSchedule> {
  const runtime = createOpenAiRuntime(OPENAI_API_KEY)
  const recorder = createLlmRecorder()
  return generateNextWeek(
    runtime,
    {
      workflow_id: 'eval:generate_next_week',
      client_id: 'eval-client',
      step: 'generate_next_week',
      recorder,
      model: OPENAI_MODEL,
    },
    input,
  )
}
