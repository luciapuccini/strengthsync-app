import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Client } from '@/api/types'

import { ApiClientError } from '@/api/errors'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))

vi.mock('@/api/client', () => ({ getSession }))

import { useAppStore } from '../useAppStore'

const UUID = '00000000-0000-4000-8000-000000000001'
const NOW = '2026-08-13T00:00:00.000Z'

const client: Client = {
  id: UUID,
  coach_id: UUID,
  display_name: 'Lucia',
  status: 'active',
  created_at: NOW,
  updated_at: NOW,
}

beforeEach(() => {
  useAppStore.setState({ sessionStatus: 'loading', sessionClient: null }, false)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('sessionSlice', () => {
  it('starts out loading, with nobody signed in', () => {
    expect(useAppStore.getState().sessionStatus).toBe('loading')
    expect(useAppStore.getState().sessionClient).toBeNull()
  })

  it('bootstraps to signed-in with the returned client', async () => {
    getSession.mockResolvedValue(client)
    await useAppStore.getState().bootstrapSession()

    expect(useAppStore.getState().sessionStatus).toBe('signed-in')
    expect(useAppStore.getState().sessionClient).toEqual(client)
  })

  it('bootstraps to signed-out when the session is rejected', async () => {
    getSession.mockRejectedValue(new ApiClientError('unauthorized', 401, 'unauthorized', 'sign in required'))
    await useAppStore.getState().bootstrapSession()

    expect(useAppStore.getState().sessionStatus).toBe('signed-out')
    expect(useAppStore.getState().sessionClient).toBeNull()
  })

  it('bootstraps to signed-out when the server cannot be reached', async () => {
    getSession.mockRejectedValue(new ApiClientError('network', 0, 'network_error', 'could not reach the server'))
    await useAppStore.getState().bootstrapSession()

    expect(useAppStore.getState().sessionStatus).toBe('signed-out')
  })

  it('marks signed in without a bootstrap call, for the athlete who just registered', () => {
    useAppStore.getState().markSignedIn(client)

    expect(useAppStore.getState().sessionStatus).toBe('signed-in')
    expect(useAppStore.getState().sessionClient).toEqual(client)
    expect(getSession).not.toHaveBeenCalled()
  })

  it('clears the client on sign-out', () => {
    useAppStore.getState().markSignedIn(client)
    useAppStore.getState().signOutSession()

    expect(useAppStore.getState().sessionStatus).toBe('signed-out')
    expect(useAppStore.getState().sessionClient).toBeNull()
  })
})
