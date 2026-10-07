import type { Hook } from '@hono/zod-openapi';
import type { Context, Env } from 'hono';
import type { BlankEnv } from 'hono/types';
import type { core } from 'zod';

import { errorResponse } from './errors.ts';

export type ValidationTarget = 'json' | 'form' | 'query' | 'param' | 'header' | 'cookie';

export type ValidationFailure = {
  status: 400;
  code: 'invalid_id' | 'invalid_input';
  message: string;
};

export function validationFailure(
  error: core.$ZodError,
  target: ValidationTarget,
): ValidationFailure {
  const issue = error.issues[0];
  const isMalformedRouteId =
    target === 'param' && issue?.code === 'invalid_format' && issue.format === 'uuid';
  const where = issue && issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
  return {
    status: 400,
    code: isMalformedRouteId ? 'invalid_id' : 'invalid_input',
    message: `${where}${issue?.message ?? 'request failed validation'}`,
  };
}

type HookResult = Parameters<Hook<unknown, BlankEnv, string, unknown>>[0];

export function defaultHook<E extends Env>(
  result: HookResult,
  c: Context<E>,
): Response | undefined {
  if (result.success) return undefined;
  const { status, code, message } = validationFailure(result.error, result.target);
  return errorResponse(c, status, code, message);
}
