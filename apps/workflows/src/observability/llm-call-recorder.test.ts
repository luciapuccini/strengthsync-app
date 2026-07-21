import { describe, expect, it, vi } from 'vitest'

import { createConsoleRecorder } from './llm-call-recorder.ts'

describe('console LlmCallRecorder', () => {
  it('records every call envelope (including failures) without payloads', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const recorder = createConsoleRecorder()

    await recorder.record({
      workflow_id: 'weekly-progression:c:w',
      client_id: 'client-1',
      step: 'analyze_week',
      model: 'test-model',
      input: { secret: 'payload' },
      output: null,
      error: 'boom',
      latency_ms: 12,
    })

    expect(log).toHaveBeenCalledOnce()
    const line = String(log.mock.calls[0]?.[1])
    expect(line).toContain('analyze_week')
    expect(line).toContain('"error":"boom"')
    // Sensitive payloads are never logged.
    expect(line).not.toContain('payload')
    log.mockRestore()
  })
})
