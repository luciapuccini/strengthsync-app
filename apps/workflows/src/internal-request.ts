import type { z } from 'zod'

import { INTERNAL_API_BASE_URL, INTERNAL_API_SERVICE_SECRET } from './config.ts'

/**
 * Authenticated HTTP helper for apps/api `/internal/*`.
 * Activities never touch D1 directly (docs/architecture/api_contracts.md).
 */

export class InternalApiError extends Error {
  readonly status: number
  readonly code: string
  readonly retryable: boolean

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'InternalApiError'
    this.status = status
    this.code = code
    // Transport/server failures retry; validation/auth/not-found do not.
    this.retryable = status >= 500 || status === 429 || status === 0
  }
}

export type InternalRequest = <S extends z.ZodType>(
  method: 'GET' | 'POST',
  path: string,
  schema: S,
  body?: unknown,
) => Promise<z.output<S>>

export type InternalRequestConfig = {
  baseUrl?: string
  serviceSecret?: string
  fetchFn?: typeof fetch
}

export function createInternalRequest(
  config: InternalRequestConfig = {},
): InternalRequest {
  const baseUrl = config.baseUrl ?? INTERNAL_API_BASE_URL
  const serviceSecret = config.serviceSecret ?? INTERNAL_API_SERVICE_SECRET
  const fetchFn = config.fetchFn ?? fetch

  if (!baseUrl) {
    throw new Error('INTERNAL_API_BASE_URL is required for workflow activities')
  }
  if (!serviceSecret) {
    throw new Error('INTERNAL_API_SERVICE_SECRET is required for workflow activities')
  }

  return async function request(method, path, schema, body) {
    let response: Response
    try {
      response = await fetchFn(`${baseUrl}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          'x-service-secret': serviceSecret,
        },
        body: body === undefined ? null : JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'internal API unreachable'
      throw new InternalApiError(0, 'internal_api_unreachable', message)
    }

    const json: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const error = readApiError(json)
      throw new InternalApiError(
        response.status,
        error.code,
        error.message || `internal API returned ${response.status}`,
      )
    }
    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      throw new InternalApiError(
        502,
        'internal_api_bad_response',
        parsed.error.issues[0]?.message ?? 'internal API response failed validation',
      )
    }
    return parsed.data
  }
}

function readApiError(json: unknown): { code: string; message: string } {
  if (
    typeof json === 'object' &&
    json !== null &&
    'error' in json &&
    typeof json.error === 'object' &&
    json.error !== null
  ) {
    const error = json.error as { code?: unknown; message?: unknown }
    return {
      code: typeof error.code === 'string' ? error.code : 'internal_api_error',
      message: typeof error.message === 'string' ? error.message : 'internal API error',
    }
  }
  return { code: 'internal_api_error', message: 'internal API error' }
}
