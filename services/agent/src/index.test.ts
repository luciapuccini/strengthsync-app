import { describe, expect, it, vi } from 'vitest'

import type { AgentRuntime, LlmCallRecorder, WorkflowLlmContext } from './index'
import {
  analyzeWeek,
  generateNextWeek,
  generatePlan,
  summarizeHistory,
  summarizeProfile,
  withLlmRecording,
} from './index'
import {
  CLIENT_ID,
  makePlan,
  makeSchedule,
  makeWeek,
  makeWeekTemplate,
  PROFILE,
} from './test-fixtures'

describe('@strengthsync/agent recording', () => {
  it('records successes and failures', async () => {
    const records: Array<{ step: string; error: string | null }> = []
    const recorder: LlmCallRecorder = {
      async record(input) {
        records.push({ step: input.step, error: input.error })
      },
    }
    const context: WorkflowLlmContext = {
      workflow_id: 'wf-1',
      client_id: CLIENT_ID,
      step: 'summarize_profile',
      recorder,
      model: 'test-model',
    }

    await expect(withLlmRecording(context, {}, async () => 'ok')).resolves.toBe('ok')
    await expect(
      withLlmRecording(context, {}, async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(records).toEqual([
      { step: 'summarize_profile', error: null },
      { step: 'summarize_profile', error: 'boom' },
    ])
  })
})

describe('summarize helpers', () => {
  it('summarizes profile and history through the runtime', async () => {
    const generateObject = vi.fn(async ({ schema }: { schema: { parse: (v: unknown) => unknown } }) =>
      schema.parse({ summary: 'Client is ready for a strength block.' }),
    )
    const runtime: AgentRuntime = {
      generateObject: generateObject as AgentRuntime['generateObject'],
    }
    const recorder: LlmCallRecorder = { record: vi.fn(async () => undefined) }
    const context: WorkflowLlmContext = {
      workflow_id: 'wf-1',
      client_id: CLIENT_ID,
      step: 'summarize_profile',
      recorder,
      model: 'test-model',
    }

    await expect(
      summarizeProfile(runtime, context, { profile: PROFILE, coaching_rules: 'push weekly' }),
    ).resolves.toEqual({ summary: 'Client is ready for a strength block.' })

    context.step = 'summarize_history'
    await expect(
      summarizeHistory(runtime, context, {
        active_plan: makePlan(),
        completed_weeks: [],
        coaching_rules: 'push weekly',
      }),
    ).resolves.toEqual({ summary: 'Client is ready for a strength block.' })
    expect(generateObject).toHaveBeenCalledTimes(2)
  })
})

describe('generatePlan helper', () => {
  it('rejects invalid plan output and still records the failure', async () => {
    const records: Array<{ error: string | null }> = []
    const runtime: AgentRuntime = {
      generateObject: vi.fn(async () => ({
        label: '',
        total_weeks: 4,
        week_template: [],
        rationale: null,
      })) as AgentRuntime['generateObject'],
    }
    const context: WorkflowLlmContext = {
      workflow_id: 'wf-1',
      client_id: CLIENT_ID,
      step: 'generate_plan',
      recorder: {
        async record(input) {
          records.push({ error: input.error })
        },
      },
      model: 'test-model',
    }

    await expect(
      generatePlan(runtime, context, {
        profile_summary: 'ready',
        history_summary: 'No prior training history.',
        previous_plan: null,
        coaching_rules: 'push weekly',
      }),
    ).rejects.toThrow()
    expect(records).toEqual([{ error: expect.any(String) }])
  })

  it('returns a validated generated plan', async () => {
    const plan = {
      label: 'Block 1',
      total_weeks: 4,
      week_template: makeWeekTemplate(),
      rationale: 'Build base strength',
    }
    const runtime: AgentRuntime = {
      generateObject: vi.fn(async () => plan) as AgentRuntime['generateObject'],
    }
    const context: WorkflowLlmContext = {
      workflow_id: 'wf-1',
      client_id: CLIENT_ID,
      step: 'generate_plan',
      recorder: { record: vi.fn(async () => undefined) },
      model: 'test-model',
    }

    await expect(
      generatePlan(runtime, context, {
        profile_summary: 'ready',
        history_summary: 'No prior training history.',
        previous_plan: null,
        coaching_rules: 'push weekly',
        notes: 'prefer mornings',
      }),
    ).resolves.toEqual(plan)
  })
})

describe('weekly progression helpers', () => {
  it('analyzes a week through the runtime', async () => {
    const runtime: AgentRuntime = {
      generateObject: vi.fn(async () => ({
        analysis: 'Hit all prescribed work; push compound lifts next week.',
      })) as AgentRuntime['generateObject'],
    }
    const context: WorkflowLlmContext = {
      workflow_id: 'wf-weekly-1',
      client_id: CLIENT_ID,
      step: 'analyze_week',
      recorder: { record: vi.fn(async () => undefined) },
      model: 'test-model',
    }

    await expect(
      analyzeWeek(runtime, context, {
        week: makeWeek(),
        active_plan: makePlan(),
        profile: PROFILE,
        coaching_rules: 'push weekly',
      }),
    ).resolves.toEqual({
      analysis: 'Hit all prescribed work; push compound lifts next week.',
    })
  })

  it('rejects an incomplete next-week schedule and still records the failure', async () => {
    const records: Array<{ error: string | null }> = []
    const runtime: AgentRuntime = {
      generateObject: vi.fn(async () => ({
        schedule: makeSchedule('2026-07-08', true).slice(0, 3),
      })) as AgentRuntime['generateObject'],
    }
    const context: WorkflowLlmContext = {
      workflow_id: 'wf-weekly-1',
      client_id: CLIENT_ID,
      step: 'generate_next_week',
      recorder: {
        async record(input) {
          records.push({ error: input.error })
        },
      },
      model: 'test-model',
    }

    await expect(
      generateNextWeek(runtime, context, {
        week: makeWeek(),
        active_plan: makePlan(),
        profile: PROFILE,
        analysis: 'push compounds',
        coaching_rules: 'push weekly',
        next_week_start_date: '2026-07-08',
      }),
    ).rejects.toThrow()
    expect(records).toEqual([{ error: expect.any(String) }])
  })

  it('returns a validated next-week schedule', async () => {
    const schedule = makeSchedule('2026-07-08', false)
    const runtime: AgentRuntime = {
      generateObject: vi.fn(async () => ({ schedule })) as AgentRuntime['generateObject'],
    }
    const context: WorkflowLlmContext = {
      workflow_id: 'wf-weekly-1',
      client_id: CLIENT_ID,
      step: 'generate_next_week',
      recorder: { record: vi.fn(async () => undefined) },
      model: 'test-model',
    }

    await expect(
      generateNextWeek(runtime, context, {
        week: makeWeek(),
        active_plan: makePlan(),
        profile: PROFILE,
        analysis: 'push compounds',
        coaching_rules: 'push weekly',
        next_week_start_date: '2026-07-08',
      }),
    ).resolves.toEqual({ schedule })
  })
})
