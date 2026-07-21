import { describe, expect, it } from 'vitest'

import type { LlmCallRecorder, WorkflowLlmContext } from './index'

describe('@strengthsync/agent', () => {
  it('recorder interface is satisfiable and callable', async () => {
    const steps: string[] = []
    const recorder: LlmCallRecorder = {
      async record(input) {
        steps.push(input.step)
      },
    }
    const context: WorkflowLlmContext = {
      workflow_id: 'wf-1',
      client_id: 'client-1',
      step: 'analyze_week',
      recorder,
    }

    await context.recorder.record({
      workflow_id: context.workflow_id,
      client_id: context.client_id,
      step: context.step,
      model: 'test-model',
      input: {},
      output: null,
      error: null,
      latency_ms: 1,
    })

    expect(steps).toEqual(['analyze_week'])
  })
})
