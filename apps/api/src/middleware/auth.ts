import { createMiddleware } from 'hono/factory'

import { errorResponse } from '../lib/errors.ts'

/**
 * Service-secret guard for /internal/* routes (docs/operations/local_worker.md).
 * Only the local workflow worker may call them; the browser never can.
 * Compares SHA-256 digests so the comparison does not leak length/timing.
 */
export function internalServiceAuth(serviceSecret: string) {
  return createMiddleware(async (c, next) => {
    const provided = c.req.header('x-service-secret') ?? ''
    const [providedDigest, expectedDigest] = await Promise.all([
      sha256Hex(provided),
      sha256Hex(serviceSecret),
    ])
    if (providedDigest !== expectedDigest) {
      return errorResponse(c, 403, 'forbidden', 'invalid internal service credentials')
    }
    await next()
  })
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
