import { describe, expect, it } from 'vitest'

import { basicHeader, createClientViaApi, createTestApp } from './testkit.ts'

type FetchCall = { url: string; init: RequestInit }

function stubFetch(handler: (url: string) => Response): { fetchFn: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = []
  const fetchFn: typeof fetch = async (input, init) => {
    const url = String(input)
    calls.push({ url, init: init ?? {} })
    return handler(url)
  }
  return { fetchFn, calls }
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const WEEK_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'

function appWithFetchStub(handler: (url: string) => Response) {
  const stub = stubFetch(handler)
  const app = createTestApp({
    workflowApi: {
      baseUrl: 'https://tunnel.example.com',
      serviceSecret: 'svc-secret',
      fetchFn: stub.fetchFn,
    },
  })
  return { app, calls: stub.calls }
}

describe('workflow proxy', () => {
  it('returns 503 when the workflow API is not configured', async () => {
    const app = createTestApp()
    const client = await createClientViaApi(app)

    const res = await app.request(`/api/clients/${client.id}/workflows/weekly-progression`, {
      method: 'POST',
      headers: { authorization: basicHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ week_id: WEEK_ID }),
    })
    expect(res.status).toBe(503)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'workflow_api_not_configured',
    )
  })

  it('forwards weekly-progression starts with the service secret and returns 202', async () => {
    const { app, calls } = appWithFetchStub(() =>
      jsonResponse({ workflow_id: 'wf-1', status: 'running' }, 202),
    )
    const client = await createClientViaApi(app)

    const res = await app.request(`/api/clients/${client.id}/workflows/weekly-progression`, {
      method: 'POST',
      headers: { authorization: basicHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ week_id: WEEK_ID }),
    })

    expect(res.status).toBe(202)
    expect(await res.json()).toEqual({ workflow_id: 'wf-1', status: 'running' })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('https://tunnel.example.com/workflows/weekly-progression')
    const headers = calls[0]?.init.headers as Record<string, string>
    expect(headers['x-service-secret']).toBe('svc-secret')
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      client_id: client.id,
      week_id: WEEK_ID,
    })
  })

  it('proxies workflow status reads with an encoded id', async () => {
    const { app, calls } = appWithFetchStub(() =>
      jsonResponse(
        {
          workflow_id: 'weekly-progression:c:w',
          type: 'weekly_progression',
          status: 'running',
          started_at: '2026-07-21T08:00:00.000Z',
        },
        200,
      ),
    )

    const res = await app.request('/api/workflows/weekly-progression:c:w', {
      headers: { authorization: basicHeader() },
    })
    expect(res.status).toBe(200)
    expect(((await res.json()) as { status: string }).status).toBe('running')
    expect(calls[0]?.url).toBe('https://tunnel.example.com/workflows/weekly-progression%3Ac%3Aw')
  })

  it('returns 502 when the workflow API cannot be reached', async () => {
    const { app } = appWithFetchStub(() => {
      throw new Error('connection refused')
    })
    const client = await createClientViaApi(app)

    const res = await app.request(`/api/clients/${client.id}/workflows/plan-generation`, {
      method: 'POST',
      headers: { authorization: basicHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(502)
  })
})
