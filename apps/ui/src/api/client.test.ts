import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Client } from '@strengthsync/domain/model'

import { createClient, getClients, getProfile } from './client'
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
})
