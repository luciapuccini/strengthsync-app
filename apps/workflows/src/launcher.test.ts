import { describe, expect, it } from 'vitest'

import {
  parseWorkflowId,
  planGenerationWorkflowId,
  weeklyProgressionWorkflowId,
} from './temporal/launcher.ts'
import { planGenerationWorkflow } from './workflows/plan-generation.ts'
import { weeklyProgressionWorkflow } from './workflows/weekly-progression.ts'

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

  it('plan generation id embeds client + date and round-trips (notes dropped)', () => {
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

describe('workflow stubs', () => {
  it('weekly progression stub returns a typed result', async () => {
    await expect(
      weeklyProgressionWorkflow({ client_id: CLIENT_ID, week_id: WEEK_ID }),
    ).resolves.toEqual({ next_week_id: null, plan_complete: false })
  })

  it('plan generation stub returns sentinel ids', async () => {
    const result = await planGenerationWorkflow({ client_id: CLIENT_ID, notes: 'push harder' })
    expect(result.plan_id.startsWith('00000000-')).toBe(true)
    expect(result.first_week_id.startsWith('00000000-')).toBe(true)
  })
})
