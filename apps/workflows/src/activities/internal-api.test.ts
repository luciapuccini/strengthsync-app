import { describe, expect, it, vi } from 'vitest'

import { createInternalRequest, InternalApiError } from '../internal-request.ts'
import { createInternalApiClient } from './internal-api.ts'
import { CLIENT_ID, WEEK_ID, initialContext, makeWeeklyContext } from './test-fixtures.ts'

function makeClient(fetchFn: typeof fetch) {
  return createInternalApiClient(
    createInternalRequest({
      baseUrl: 'http://api.test',
      serviceSecret: 'secret',
      fetchFn,
    }),
  )
}

describe('internal API client plan-generation', () => {
  it('sends the service secret and validates plan-generation context', async () => {
    const context = initialContext()
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toContain(`/internal/clients/${CLIENT_ID}/plan-generation-context`)
      expect(init?.headers).toMatchObject({ 'x-service-secret': 'secret' })
      return new Response(JSON.stringify(context), { status: 200 })
    })

    await expect(makeClient(fetchFn as typeof fetch).getPlanGenerationContext(CLIENT_ID)).resolves.toEqual(
      context,
    )
  })

  it('marks 4xx lifecycle errors as non-retryable', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: 'plan_not_complete', message: 'not done' } }), {
          status: 400,
        }),
    )

    await expect(makeClient(fetchFn as typeof fetch).getPlanGenerationContext(CLIENT_ID)).rejects.toMatchObject(
      {
        name: 'InternalApiError',
        code: 'plan_not_complete',
        retryable: false,
        status: 400,
      } satisfies Partial<InternalApiError>,
    )
  })

  it('marks transport failures as retryable', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('connection refused')
    })

    await expect(makeClient(fetchFn as typeof fetch).getPlanGenerationContext(CLIENT_ID)).rejects.toMatchObject(
      {
        retryable: true,
        status: 0,
      },
    )
  })
})

describe('internal API client weekly progression', () => {
  it('loads weekly context, completes a week, and creates the next week', async () => {
    const weekly = makeWeeklyContext()
    const nextWeek = {
      ...weekly.week,
      id: '5e6f7a8b-9c0d-4e1f-a23b-4c5d6e7f8a9b',
      week_index: 2,
      schedule: [...weekly.week.schedule],
    }
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/weekly-context')) {
        expect(url).toContain(`weekId=${WEEK_ID}`)
        return new Response(JSON.stringify(weekly), { status: 200 })
      }
      if (url.includes('/complete')) {
        expect(init?.method).toBe('POST')
        expect(JSON.parse(String(init?.body))).toEqual({ workflow_id: 'wf-1' })
        return new Response(JSON.stringify({ week: weekly.week }), { status: 200 })
      }
      if (url.includes('/weeks/next')) {
        return new Response(JSON.stringify({ week: nextWeek }), { status: 200 })
      }
      throw new Error(`unexpected url ${url}`)
    })
    const client = makeClient(fetchFn as typeof fetch)

    await expect(client.getWeeklyContext(CLIENT_ID, WEEK_ID)).resolves.toEqual(weekly)
    await expect(client.completeWeek(CLIENT_ID, WEEK_ID, { workflow_id: 'wf-1' })).resolves.toEqual(
      weekly.week,
    )
    await expect(
      client.createNextWeek(CLIENT_ID, {
        workflow_id: 'wf-1',
        previous_week_id: WEEK_ID,
        schedule: [],
      }),
    ).resolves.toEqual(nextWeek)
  })
})
