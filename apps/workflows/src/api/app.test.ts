import { describe, expect, it } from 'vitest'

import type {
  PlanGenerationInput,
  WeeklyProgressionInput,
  WorkflowStatus,
} from '@strengthsync/domain/contracts'

import {
  WorkflowNotFailedError,
  type StartResult,
  type WorkflowLauncher,
} from '../temporal/launcher.ts'
import { createWorkflowApi } from './app.ts'

const SECRET = 'test-service-secret'
const CLIENT_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const WEEK_ID = '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e'

type RecordedStart =
  | { kind: 'weekly'; input: WeeklyProgressionInput }
  | { kind: 'plan'; input: PlanGenerationInput }

function fakeLauncher(overrides: Partial<WorkflowLauncher> = {}) {
  const starts: RecordedStart[] = []
  const launcher: WorkflowLauncher = {
    startWeeklyProgression: async (input) => {
      starts.push({ kind: 'weekly', input })
      return { workflowId: `weekly-progression:${input.client_id}:${input.week_id}`, alreadyRunning: false }
    },
    startPlanGeneration: async (input) => {
      starts.push({ kind: 'plan', input })
      return { workflowId: `plan-generation:${input.client_id}:2026-07-21`, alreadyRunning: false }
    },
    getStatus: async () => null,
    retry: async () => null,
    ...overrides,
  }
  return { launcher, starts }
}

function createApi(launcher: WorkflowLauncher) {
  return createWorkflowApi({ serviceSecret: SECRET, launcher })
}

function secretHeader(): Record<string, string> {
  return { 'x-service-secret': SECRET, 'content-type': 'application/json' }
}

describe('workflow-start API: auth + validation', () => {
  it('GET /health is open', async () => {
    const { launcher } = fakeLauncher()
    const res = await createApi(launcher).request('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('rejects /workflows/* without the service secret (403)', async () => {
    const { launcher } = fakeLauncher()
    const res = await createApi(launcher).request('/workflows/weekly-progression', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, week_id: WEEK_ID }),
    })
    expect(res.status).toBe(403)
  })

  it('rejects an invalid start body (400)', async () => {
    const { launcher } = fakeLauncher()
    const res = await createApi(launcher).request('/workflows/weekly-progression', {
      method: 'POST',
      headers: secretHeader(),
      body: JSON.stringify({ client_id: 'not-a-uuid', week_id: WEEK_ID }),
    })
    expect(res.status).toBe(400)
  })
})

describe('workflow-start API: start/status/retry', () => {
  it('starts weekly progression and returns 202 with the deterministic id', async () => {
    const { launcher, starts } = fakeLauncher()
    const res = await createApi(launcher).request('/workflows/weekly-progression', {
      method: 'POST',
      headers: secretHeader(),
      body: JSON.stringify({ client_id: CLIENT_ID, week_id: WEEK_ID }),
    })
    expect(res.status).toBe(202)
    expect(await res.json()).toEqual({
      workflow_id: `weekly-progression:${CLIENT_ID}:${WEEK_ID}`,
      status: 'running',
    })
    expect(starts).toEqual([{ kind: 'weekly', input: { client_id: CLIENT_ID, week_id: WEEK_ID } }])
  })

  it('returns the existing running workflow on a duplicate start', async () => {
    const existing: StartResult = {
      workflowId: `weekly-progression:${CLIENT_ID}:${WEEK_ID}`,
      alreadyRunning: true,
    }
    const { launcher } = fakeLauncher({ startWeeklyProgression: async () => existing })
    const res = await createApi(launcher).request('/workflows/weekly-progression', {
      method: 'POST',
      headers: secretHeader(),
      body: JSON.stringify({ client_id: CLIENT_ID, week_id: WEEK_ID }),
    })
    expect(res.status).toBe(202)
    expect(((await res.json()) as { workflow_id: string }).workflow_id).toBe(existing.workflowId)
  })

  it('returns 404 for an unknown workflow status', async () => {
    const { launcher } = fakeLauncher()
    const res = await createApi(launcher).request('/workflows/weekly-progression:a:b', {
      headers: secretHeader(),
    })
    expect(res.status).toBe(404)
  })

  it('maps a known workflow status', async () => {
    const status: WorkflowStatus = {
      workflow_id: `weekly-progression:${CLIENT_ID}:${WEEK_ID}`,
      type: 'weekly_progression',
      status: 'running',
      started_at: '2026-07-21T08:00:00.000Z',
    }
    const { launcher } = fakeLauncher({ getStatus: async () => status })
    const res = await createApi(launcher).request(
      `/workflows/weekly-progression%3A${CLIENT_ID}%3A${WEEK_ID}`,
      { headers: secretHeader() },
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(status)
  })

  it('retries a failed workflow (202) and rejects retrying a running one (409)', async () => {
    const { launcher } = fakeLauncher({
      retry: async () => ({
        workflowId: `plan-generation:${CLIENT_ID}:2026-07-21`,
        alreadyRunning: false,
      }),
    })
    const res = await createApi(launcher).request(
      `/workflows/plan-generation%3A${CLIENT_ID}%3A2026-07-21/retry`,
      { method: 'POST', headers: secretHeader() },
    )
    expect(res.status).toBe(202)

    const conflict = createApi(
      fakeLauncher({
        retry: async () => {
          throw new WorkflowNotFailedError('wf')
        },
      }).launcher,
    )
    const res409 = await conflict.request(`/workflows/plan-generation%3A${CLIENT_ID}%3A2026-07-21/retry`, {
      method: 'POST',
      headers: secretHeader(),
    })
    expect(res409.status).toBe(409)
  })
})
