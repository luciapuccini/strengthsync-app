import type { Context } from 'hono'
import type { z } from 'zod'

import { UuidSchema } from '@strengthsync/domain/model'

import { errorResponse } from './errors.ts'

/**
 * Parse the JSON body and validate it against a contract schema.
 * Returns the parsed data, or a ready 400 Response on failure.
 * See docs/architecture/api_contracts.md — invalid input returns 400.
 */
export async function parseBody<S extends z.ZodType>(
  c: Context,
  schema: S,
): Promise<z.output<S> | Response> {
  const raw = await c.req.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue && issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
    return errorResponse(
      c,
      400,
      'invalid_input',
      `${where}${issue?.message ?? 'request body failed validation'}`,
    )
  }
  return parsed.data
}

/** Public route ids are UUIDs; anything else is a 400, not a 404. */
export function parseUuidParam(c: Context, value: string, name: string): string | Response {
  const parsed = UuidSchema.safeParse(value)
  if (!parsed.success) {
    return errorResponse(c, 400, 'invalid_id', `${name} must be a UUID`)
  }
  return parsed.data
}

/** Type guard for the data-or-Response helpers above. */
export function isResponse(value: unknown): value is Response {
  return value instanceof Response
}
