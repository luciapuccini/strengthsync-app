import { beforeEach, describe, expect, it, vi } from 'vitest'

const spanLog = vi.fn()
const traced = vi.fn(
  async (
    fn: (span: { log: typeof spanLog }) => Promise<void>,
    _opts?: unknown,
  ) => {
    await fn({ log: spanLog })
  },
)
const initLogger = vi.fn((_opts?: unknown) => ({ traced }))

vi.mock('braintrust', () => ({
  initLogger: (opts: unknown) => initLogger(opts),
}))

describe('createBraintrustRecorder', () => {
  beforeEach(() => {
    spanLog.mockReset()
    traced.mockClear()
    initLogger.mockClear()
  })

  it('logs validated input/output and workflow metadata on success', async () => {
    const { createBraintrustRecorder } = await import('./braintrust-recorder.ts')
    const recorder = createBraintrustRecorder({
      apiKey: 'bt-test',
      projectName: 'test-project',
    })

    expect(initLogger).toHaveBeenCalledWith({
      apiKey: 'bt-test',
      projectName: 'test-project',
    })

    await recorder.record({
      workflow_id: 'weekly-progression:c:w',
      client_id: 'client-1',
      step: 'generate_next_week',
      model: 'gpt-test',
      input: { analysis: 'push load' },
      output: { schedule: [] },
      error: null,
      latency_ms: 42,
    })

    expect(traced).toHaveBeenCalledOnce()
    expect(traced.mock.calls[0]?.[1]).toMatchObject({
      name: 'generate_next_week',
      type: 'llm',
    })
    expect(spanLog).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { analysis: 'push load' },
        output: { schedule: [] },
        metrics: { latency_ms: 42 },
        metadata: expect.objectContaining({
          workflow_id: 'weekly-progression:c:w',
          workflow_type: 'weekly_progression',
          client_id: 'client-1',
          step: 'generate_next_week',
          model: 'gpt-test',
          tool_calls: [],
          error: null,
        }),
      }),
    )
  })

  it('records safe errors without dropping the span', async () => {
    const { createBraintrustRecorder } = await import('./braintrust-recorder.ts')
    const recorder = createBraintrustRecorder({
      apiKey: 'bt-test',
      projectName: 'test-project',
    })

    await recorder.record({
      workflow_id: 'plan-generation:c:d',
      client_id: 'client-2',
      step: 'generate_plan',
      model: 'gpt-test',
      input: { notes: 'focus squat' },
      output: null,
      error: 'model returned no structured output',
      latency_ms: 10,
    })

    expect(spanLog).toHaveBeenCalledWith(
      expect.objectContaining({
        output: null,
        error: 'model returned no structured output',
        metadata: expect.objectContaining({
          workflow_type: 'plan_generation',
          error: 'model returned no structured output',
        }),
      }),
    )
  })
})
