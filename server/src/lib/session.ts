import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { errorResponse } from "./errors.ts";
import { LIFETIME_SECONDS, issue, read } from "./session-token.ts";

/**
 * The HTTP half of a session: the cookie that carries the token, and the
 * middleware that reads it back. Deliberately thin glue — the token format and
 * lifetime live in `session-token.ts`, and this module only decides how that
 * token travels.
 *
 * `Secure` is set from `NODE_ENV`: wrangler dev sets development, deploy/build
 * set production. Without that split the cookie would be dropped over plain
 * http in local development. Note this is the only environment split left in
 * the auth path — the guard itself runs everywhere.
 */

const COOKIE_NAME = "session";

/** Set on the context by `requireSession`, read by the guarded handlers. */
export type SessionVariables = { clientId: string };

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  } as const;
}

/** Issue a token for a client and send it back as the session cookie. */
export async function setSessionCookie(
  c: Context,
  clientId: string,
  secret: string,
): Promise<void> {
  const token = await issue(clientId, secret);
  setCookie(c, COOKIE_NAME, token, { ...cookieOptions(), maxAge: LIFETIME_SECONDS });
}

/** Expire the session cookie. Safe to call without one present. */
export function clearSessionCookie(c: Context): void {
  deleteCookie(c, COOKIE_NAME, cookieOptions());
}

/**
 * Guard a route on a valid session, placing the client id on the context.
 *
 * A missing, expired, tampered or wrong-secret cookie is one case, not four:
 * `read` fails closed for all of them, so they produce the same 401. Middleware
 * is not an `openapi()` handler, so it returns a plain response here; the 401
 * declared on the guarded routes documents this shape.
 */
export function requireSession(
  secret: string,
): MiddlewareHandler<{ Variables: SessionVariables }> {
  return async (c, next) => {
    const token = getCookie(c, COOKIE_NAME);
    const clientId = token ? await read(token, secret) : undefined;
    if (!clientId) {
      return errorResponse(c, 401, "unauthorized", "sign in required");
    }
    c.set("clientId", clientId);
    await next();
  };
}
