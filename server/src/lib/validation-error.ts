import type { Hook } from '@hono/zod-openapi'
import type { Context, Env } from 'hono'
import type { BlankEnv } from 'hono/types'
import type { core } from 'zod'

import { errorResponse } from './errors.ts'

/** Hono's validation targets; `target` on a validator hook result. */
export type ValidationTarget = 'json' | 'form' | 'query' | 'param' | 'header' | 'cookie'

export type ValidationFailure = {
  status: 400
  code: 'invalid_id' | 'invalid_input'
  message: string
}

/**
 * Map a Zod failure to the API error envelope.
 *
 * Pure on purpose — no Context, no Response — because this is the single point
 * where declarative validation could silently change the error contract that
 * `app.public.test.ts` and the UI's error handling both depend on.
 *
 * Public route ids are UUIDs (docs/architecture/api_contracts.md), so a
 * malformed UUID in the path is `invalid_id`. Everything else is
 * `invalid_input` — including a path param that is not an id, such as
 * `dayIndex`, which is a value out of range rather than an unusable route.
 */
export function validationFailure(
  error: core.$ZodError,
  target: ValidationTarget,
): ValidationFailure {
  const issue = error.issues[0]
  const isMalformedRouteId =
    target === 'param' && issue?.code === 'invalid_format' && issue.format === 'uuid'
  const where = issue && issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
  return {
    status: 400,
    code: isMalformedRouteId ? 'invalid_id' : 'invalid_input',
    message: `${where}${issue?.message ?? 'request failed validation'}`,
  }
}

/** What a validator hands the hook. Independent of the app's Env. */
type HookResult = Parameters<Hook<unknown, BlankEnv, string, unknown>>[0]

/**
 * The single validation hook. Every `OpenAPIHono` instance is constructed with
 * it, so every declared request part — params, query, body — fails into the
 * same envelope regardless of which area declared the route.
 *
 * Generic in `E` so the `wf` area, which is typed with the Worker bindings, can
 * use the same hook as the areas that are not.
 */
export function defaultHook<E extends Env>(
  result: HookResult,
  c: Context<E>,
): Response | undefined {
  if (result.success) return undefined
  const { status, code, message } = validationFailure(result.error, result.target)
  return errorResponse(c, status, code, message)
}
