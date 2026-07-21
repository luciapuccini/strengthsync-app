import type { Context } from 'hono'

import { RepoError, type RepoErrorKind } from '@strengthsync/db'
import type { ApiError } from '@strengthsync/domain/contracts'

const STATUS_BY_KIND: Record<RepoErrorKind, 400 | 404 | 409> = {
  validation: 400,
  not_found: 404,
  conflict: 409,
}

export function errorResponse(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 500 | 502 | 503,
  code: string,
  message: string,
): Response {
  return c.json<ApiError>({ error: { code, message } }, status)
}

/** Map a thrown RepoError to its HTTP status; rethrow anything else. */
export function repoErrorResponse(c: Context, err: unknown): Response {
  if (err instanceof RepoError) {
    return errorResponse(c, STATUS_BY_KIND[err.kind], err.code, err.message)
  }
  throw err
}
