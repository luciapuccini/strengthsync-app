import { describe, expect, it, vi } from 'vitest'

import type { AgentRuntime, LlmCallRecorder, WorkflowLlmContext } from './index'
import { generatePlan, summarizeHistory, summarizeProfile, withLlmRecording } from './index'

const CLIENT_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const PROFILE = {
  id: CLIENT_ID,
  client_id: CLIENT_ID,
  snapshot_date: '2026-07-01',
  sex: 'female',
  age: 34,
  height_cm: 165,
  goals: { primary: 'strength' },
  body_composition: { weight_kg: 62 },
  strength_loads: { press_banca: 60 },
  nutrition: null,
  swimming: null,
  schedule_preferences: { days_per_week: 4 },
  notes: null,
  updated_at: '2026-07-01T00:00:00.000Z',
}

function makeWeekTemplate() {
  return [1, 2, 3, 4, 5, 6, 7].map((day_index) => ({
    day_index,
    type: day_index === 7 ? ('rest' as const) : ('upper_body' as const),
    notes: null,
    exercises:
      day_index === 7
        ? []
        : [
            {
              exercise_key: 'press_banca',
              name: 'Bench press',
              series: 4,
              reps: 8,
              rest_time_sec: 120,
              weight_kg: 60,
              notes: null,
            },
          ],
  }))
}

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
    const plan = {
      id: CLIENT_ID,
      client_id: CLIENT_ID,
      label: 'Block 1',
      status: 'active' as const,
      total_weeks: 2,
      week_template: makeWeekTemplate(),
      rationale: null,
      activated_at: '2026-07-01T00:00:00.000Z',
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
    }
    await expect(
      summarizeHistory(runtime, context, {
        active_plan: plan,
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
