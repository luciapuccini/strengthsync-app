import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Client } from '@strengthsync/domain/model'

import { makeWeek } from '@/test/weekFixture'

import {
  createClient,
  getClients,
  getProfile,
  getWorkflowStatus,
  saveDayLog,
  startPlanGeneration,
  startWeeklyProgression,
} from './client'
import { ApiClientError } from './errors'

const UUID = '00000000-0000-4000-8000-000000000001'
const NOW = '2026-05-10T00:00:00.000Z'

const sampleClient: Client = {
  id: UUID,
  coach_id: UUID,
  display_name: 'Lucia',
  status: 'active',
  created_at: NOW,
  updated_at: NOW,
}

function stubFetch(response: { ok: boolean; status: number; body: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: () => Promise.resolve(response.body),
  } as Response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api client', () => {
  it('parses a successful list response', async () => {
    stubFetch({ ok: true, status: 200, body: { clients: [sampleClient] } })
    await expect(getClients()).resolves.toEqual([sampleClient])
  })

  it('posts the validated body and parses the created client', async () => {
    const fetchMock = stubFetch({ ok: true, status: 201, body: { client: sampleClient } })
    await createClient({ display_name: 'Lucia' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/clients',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ display_name: 'Lucia' }) }),
    )
  })

  it('maps a 401 to an unauthorized error', async () => {
    stubFetch({ ok: false, status: 401, body: { error: { code: 'unauthorized', message: 'nope' } } })
    await expect(getClients()).rejects.toMatchObject({ kind: 'unauthorized', status: 401 })
  })

  it('treats a 404 profile as "no profile yet"', async () => {
    stubFetch({
      ok: false,
      status: 404,
      body: { error: { code: 'profile_not_found', message: 'none' } },
    })
    await expect(getProfile(UUID)).resolves.toBeNull()
  })

  it('surfaces a network failure as a network error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getClients()).rejects.toBeInstanceOf(ApiClientError)
    await expect(getClients()).rejects.toMatchObject({ kind: 'network' })
  })

  it('posts a save-day body and parses the returned week', async () => {
    const week = makeWeek()
    const body = { exercises: [] }
    const fetchMock = stubFetch({ ok: true, status: 200, body: { week } })
    await expect(saveDayLog(UUID, UUID, 2, body)).resolves.toEqual(week)
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/clients/${UUID}/weeks/${UUID}/days/2/save`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
    )
  })

  it('starts both workflow types with their browser-facing contracts', async () => {
    const started = { workflow_id: 'workflow-1', status: 'running' }
    const fetchMock = stubFetch({ ok: true, status: 202, body: started })

    await expect(startWeeklyProgression(UUID, UUID)).resolves.toEqual(started)
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/clients/${UUID}/workflows/weekly-progression`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ week_id: UUID }),
      }),
    )

    await expect(startPlanGeneration(UUID, { notes: 'Build a new block.' })).resolves.toEqual(
      started,
    )
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/clients/${UUID}/workflows/plan-generation`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ notes: 'Build a new block.' }),
      }),
    )
  })

  it('parses workflow status responses', async () => {
    const status = {
      workflow_id: 'workflow/1',
      type: 'weekly_progression',
      status: 'running',
      started_at: NOW,
    }
    const fetchMock = stubFetch({ ok: true, status: 200, body: status })
    await expect(getWorkflowStatus('workflow/1')).resolves.toEqual(status)
    expect(fetchMock).toHaveBeenCalledWith('/api/workflows/workflow%2F1', expect.any(Object))
  })
})
