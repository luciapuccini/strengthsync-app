import { describe, expect, it } from 'vitest'

import {
  parseWorkflowId,
  planGenerationWorkflowId,
  weeklyProgressionWorkflowId,
} from './temporal/launcher.ts'

const CLIENT_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const WEEK_ID = '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e'

describe('workflow ids', () => {
  it('weekly progression id embeds client + week and round-trips', () => {
    const id = weeklyProgressionWorkflowId({ client_id: CLIENT_ID, week_id: WEEK_ID })
    expect(id).toBe(`weekly-progression:${CLIENT_ID}:${WEEK_ID}`)
    expect(parseWorkflowId(id)).toEqual({
      type: 'weekly_progression',
      input: { client_id: CLIENT_ID, week_id: WEEK_ID },
    })
  })

  it('plan generation id embeds client + date and round-trips (notes dropped from id)', () => {
    const id = planGenerationWorkflowId(CLIENT_ID)
    expect(id.startsWith(`plan-generation:${CLIENT_ID}:`)).toBe(true)
    expect(parseWorkflowId(id)).toEqual({
      type: 'plan_generation',
      input: { client_id: CLIENT_ID },
    })
  })

  it('rejects unknown id shapes', () => {
    expect(parseWorkflowId('something-else')).toBeNull()
    expect(parseWorkflowId('weekly-progression:only-client')).toBeNull()
  })
})
