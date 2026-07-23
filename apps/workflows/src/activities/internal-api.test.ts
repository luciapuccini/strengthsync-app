import { describe, expect, it, vi } from 'vitest'

import { createInternalRequest, InternalApiError } from '../internal-request.ts'
import { createInternalApiClient } from './internal-api.ts'
import { initialContext, CLIENT_ID } from './test-fixtures.ts'

describe('internal API client', () => {
  it('sends the service secret and validates plan-generation context', async () => {
    const context = initialContext()
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toContain(`/internal/clients/${CLIENT_ID}/plan-generation-context`)
      expect(init?.headers).toMatchObject({ 'x-service-secret': 'secret' })
      return new Response(JSON.stringify(context), { status: 200 })
    })
    const client = createInternalApiClient(
      createInternalRequest({
        baseUrl: 'http://api.test',
        serviceSecret: 'secret',
        fetchFn: fetchFn as typeof fetch,
      }),
    )

    await expect(client.getPlanGenerationContext(CLIENT_ID)).resolves.toEqual(context)
  })

  it('marks 4xx lifecycle errors as non-retryable', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: 'plan_not_complete', message: 'not done' } }), {
          status: 400,
        }),
    )
    const client = createInternalApiClient(
      createInternalRequest({
        baseUrl: 'http://api.test',
        serviceSecret: 'secret',
        fetchFn: fetchFn as typeof fetch,
      }),
    )

    await expect(client.getPlanGenerationContext(CLIENT_ID)).rejects.toMatchObject({
      name: 'InternalApiError',
      code: 'plan_not_complete',
      retryable: false,
      status: 400,
    } satisfies Partial<InternalApiError>)
  })

  it('marks transport failures as retryable', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('connection refused')
    })
    const client = createInternalApiClient(
      createInternalRequest({
        baseUrl: 'http://api.test',
        serviceSecret: 'secret',
        fetchFn: fetchFn as typeof fetch,
      }),
    )

    await expect(client.getPlanGenerationContext(CLIENT_ID)).rejects.toMatchObject({
      retryable: true,
      status: 0,
    })
  })
})
