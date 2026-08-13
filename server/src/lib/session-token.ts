/**
 * Session tokens: HS256 JWTs via the JWT helpers bundled with Hono, so no
 * dependency is added. The payload carries the signed-in client's id as the
 * subject, plus issued-at and expiry — nothing else. The thirty-day lifetime
 * and the payload shape are defined only here, so changing the token format
 * later touches one file.
 */
import { sign, verify as verifyJwt } from 'hono/jwt';

const ALGORITHM = 'HS256';

/**
 * Thirty days. Exported so the cookie that carries the token can set the same
 * lifetime rather than declaring a second one that could drift from this.
 */
export const LIFETIME_SECONDS = 30 * 24 * 60 * 60;

/** Issue a session token for a client, valid for thirty days. */
export async function issue(clientId: string, secret: string): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  return sign(
    { sub: clientId, iat: issuedAt, exp: issuedAt + LIFETIME_SECONDS },
    secret,
    ALGORITHM,
  );
}

/**
 * Read a session token back to its client id. Fails closed: an expired,
 * tampered, wrong-secret or structurally malformed token returns undefined
 * rather than throwing.
 */
export async function read(token: string, secret: string): Promise<string | undefined> {
  try {
    const payload = await verifyJwt(token, secret, ALGORITHM);
    return typeof payload.sub === 'string' ? payload.sub : undefined;
  } catch {
    return undefined;
  }
}
