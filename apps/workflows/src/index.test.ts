import { describe, expect, it } from 'vitest'

import { assertRecorder } from './index'
import type { WorkflowDefinitionPreview } from './index'

describe('@strengthsync/workflows', () => {
  it('fails fast when no LLM call recorder is configured', () => {
    expect(() => assertRecorder(null)).toThrow(/LlmCallRecorder/)
  })

  it('passes through a configured recorder', () => {
    const recorder = { record: async () => {} }
    expect(assertRecorder(recorder)).toBe(recorder)
  })

  it('previews the weekly progression workflow shape', () => {
    const preview: WorkflowDefinitionPreview = {
      name: 'weekly_progression',
      steps: ['analyze_week', 'generate_next_week'],
      requiresRecorder: true,
    }
    expect(preview.requiresRecorder).toBe(true)
  })
})
