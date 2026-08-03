import { describe, expect, it } from 'vitest'

import {
  parseWorkflowId,
  planGenerationWorkflowId,
  weeklyProgressionWorkflowId,
  workflowIdTimestamp,
} from './temporal/launcher.ts'

const CLIENT_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const WEEK_ID = '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e'
const FIXED = new Date('2026-08-03T10:45:12.345Z')

describe('workflow ids', () => {
  it('weekly progression id embeds client, week, and colon-safe timestamp', () => {
    const ts = workflowIdTimestamp(FIXED)
    const id = weeklyProgressionWorkflowId({ client_id: CLIENT_ID, week_id: WEEK_ID }, FIXED)
    expect(id).toBe(`weekly-progression:${CLIENT_ID}:${WEEK_ID}:${ts}`)
    expect(ts).toBe('2026-08-03T10-45-12.345Z')
    expect(parseWorkflowId(id)).toBe('weekly_progression')
  })

  it('plan generation id embeds client and colon-safe timestamp', () => {
    const ts = workflowIdTimestamp(FIXED)
    const id = planGenerationWorkflowId(CLIENT_ID, FIXED)
    expect(id).toBe(`plan-generation:${CLIENT_ID}:${ts}`)
    expect(parseWorkflowId(id)).toBe('plan_generation')
  })

  it('rejects unknown id shapes', () => {
    expect(parseWorkflowId('something-else')).toBeNull()
    expect(parseWorkflowId('weekly-progression:only-client')).toBeNull()
  })
})
