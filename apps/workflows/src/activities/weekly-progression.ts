import { ApplicationFailure } from '@temporalio/common'

import { analyzeWeek, createOpenAiRuntime, generateNextWeek } from '@strengthsync/agent'
import type { WeeklyContext } from '@strengthsync/domain/contracts'
import type { Week, WeekDay } from '@strengthsync/domain/model'

import { OPENAI_API_KEY, OPENAI_MODEL } from '../config.ts'
import { createConsoleRecorder } from '../observability/llm-call-recorder.ts'
import { createInternalApiClient, InternalApiError } from './internal-api.ts'

const internalApi = createInternalApiClient()
const runtime = createOpenAiRuntime(OPENAI_API_KEY)
const recorder = createConsoleRecorder()

export async function completeWeekActivity(input: {
  workflow_id: string
  client_id: string
  week_id: string
}): Promise<Week> {
  return withInternalErrors(() =>
    internalApi.completeWeek(input.client_id, input.week_id, {
      workflow_id: input.workflow_id,
    }),
  )
}

export async function loadWeeklyContext(input: {
  client_id: string
  week_id: string
}): Promise<WeeklyContext> {
  return withInternalErrors(() => internalApi.getWeeklyContext(input.client_id, input.week_id))
}

export async function analyzeWeekActivity(input: {
  workflow_id: string
  client_id: string
  context: WeeklyContext
}): Promise<string> {
  const result = await analyzeWeek(
    runtime,
    {
      workflow_id: input.workflow_id,
      client_id: input.client_id,
      step: 'analyze_week',
      recorder,
      model: OPENAI_MODEL,
    },
    {
      week: input.context.week,
      active_plan: input.context.active_plan,
      profile: input.context.profile,
      coaching_rules: input.context.coaching_rules,
    },
  )
  return result.analysis
}

export async function generateNextWeekActivity(input: {
  workflow_id: string
  client_id: string
  context: WeeklyContext
  analysis: string
}): Promise<WeekDay[]> {
  const nextWeekStart = addDays(input.context.week.start_date, 7)
  const result = await generateNextWeek(
    runtime,
    {
      workflow_id: input.workflow_id,
      client_id: input.client_id,
      step: 'generate_next_week',
      recorder,
      model: OPENAI_MODEL,
    },
    {
      week: input.context.week,
      active_plan: input.context.active_plan,
      profile: input.context.profile,
      analysis: input.analysis,
      coaching_rules: input.context.coaching_rules,
      next_week_start_date: nextWeekStart,
    },
  )
  return result.schedule
}

export async function createNextWeekActivity(input: {
  workflow_id: string
  client_id: string
  previous_week_id: string
  schedule: WeekDay[]
}): Promise<Week> {
  return withInternalErrors(() =>
    internalApi.createNextWeek(input.client_id, {
      workflow_id: input.workflow_id,
      previous_week_id: input.previous_week_id,
      schedule: input.schedule,
    }),
  )
}

/** UTC calendar-day offset for ISO dates (`YYYY-MM-DD`). */
function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const ms = Date.UTC(year!, month! - 1, day!) + days * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
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
