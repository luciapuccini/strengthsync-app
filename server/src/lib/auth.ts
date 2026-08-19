import type { MiddlewareHandler } from 'hono';

import { errorResponse } from './errors.ts';

/**
 * The guard on `/api/*`. See docs/architecture/auth.md.
 *
 * Right now it rejects everything. That is deliberate and temporary: the
 * hand-rolled session system it replaced has been deleted
 * (`issues/011-amputate-old-auth.md`) and Auth0 token verification has not
 * landed yet (`issues/012-token-verification-and-provisioning.md`). Deleting the
 * old system first means every issue after it works against one auth system
 * instead of keeping two of them green.
 *
 * It is a stub rather than a hole because of `clientId`. Every guarded handler
 * reads that off the context, so the middleware that *declares* the variable has
 * to keep existing or typecheck breaks across every route in `routes/`. Keeping
 * the signature and the context shape is what makes issue 012 an edit to this
 * one function rather than a change to eight route files.
 *
 * Failing closed is also the only honest interim state. The alternative — a guard
 * that waves requests through until the real one arrives — would mean the API
 * spends a commit with `/api/*` fully open, and `/api/me/plans/generate` spends
 * model budget. There are no production users, so rejecting everyone costs
 * nothing.
 */

/** Set on the context by `requireAuth`, read by the guarded handlers. */
export type AuthVariables = { clientId: string };

export function requireAuth(): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c) => {
    // One rejection for every cause, as before: a caller learns that it needs
    // credentials, not which part of them was wrong. Middleware is not an
    // `openapi()` handler, so this is a plain response; the 401 declared on the
    // guarded routes documents the shape.
    return errorResponse(c, 401, 'unauthorized', 'sign in required');
  };
}
