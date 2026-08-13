import type { ApiError } from './types';

/** Coarse classification the UI branches on (auth prompt, not-found, etc.). */
export type ApiErrorKind =
  'unauthorized' | 'not_found' | 'validation' | 'conflict' | 'network' | 'server' | 'unknown';

/** Error thrown by every api-client call; carries the mapped status + code. */
export class ApiClientError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly code: string;

  constructor(kind: ApiErrorKind, status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 404) return 'not_found';
  if (status === 400) return 'validation';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  return 'unknown';
}

function isApiErrorEnvelope(body: unknown): body is ApiError {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false;
  const { error } = body as { error: unknown };
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

/** Map a non-2xx response body to a typed client error. */
export function toApiError(status: number, body: unknown): ApiClientError {
  const kind = kindForStatus(status);
  if (isApiErrorEnvelope(body)) {
    return new ApiClientError(kind, status, body.error.code, body.error.message);
  }
  return new ApiClientError(
    kind,
    status,
    'unexpected_error',
    `request failed with status ${status}`,
  );
}
