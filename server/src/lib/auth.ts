import type { MiddlewareHandler } from 'hono';
import { Jwt } from 'hono/utils/jwt';

import type { Db } from '../db/index.ts';

import { errorResponse } from './errors.ts';
import { resolveClientId } from './identity.ts';
import type { ManagementClient } from './management.ts';

/**
 * The guard on `/api/*`. See docs/architecture/auth.md.
 *
 * A verified bearer token is the only way into the API, in every environment.
 * There is deliberately no development exemption: a guard that is off while the
 * code is being written is a guard nobody tests.
 *
 * `clientId` on the context is the whole output. Handlers read it and never see
 * a token, an issuer or a subject — which is why issue 012 changed no route
 * file. The subject stops here, at the edge, and the provider's vocabulary goes
 * no further into the application.
 */

/** Set on the context by `requireAuth`, read by the guarded handlers. */
export type AuthVariables = { clientId: string };

/** What survives verification. Everything else in the token is not our business. */
export type VerifiedToken = { sub: string };

/** Returns null for any token that should not be trusted, for any reason. */
export type TokenVerifier = (token: string) => Promise<VerifiedToken | null>;

export type AuthConfig = {
  /** With the trailing slash. Auth0 issues `https://auth.example/` and a string compare without it fails everything. */
  issuer: string;
  /** The API identifier registered at the tenant, which is the `aud` claim. */
  audience: string;
  jwksUri: string;
};

/** `JsonWebKey` plus the id that selects it. Hono's own alias is not exported. */
type Jwk = JsonWebKey & { kid?: string };

/**
 * Verification against the tenant's published key set.
 *
 * **This function is not covered by the suite**, and that is a deliberate trade
 * recorded in `issues/auth0-migration/prd.md`: the alternative is either network
 * access from the pre-commit gate or a synthetic key-pair harness that proves
 * the algorithm rather than the configuration. Tests inject a stub verifier
 * instead. The consequence is that a wrong issuer, audience or JWKS URL fails in
 * a deployed environment and not locally — so those three strings are the first
 * thing to check when a token that should work does not.
 *
 * The key-set cache below *is* covered, because it is the part with state.
 */
export function createTokenVerifier(
  config: AuthConfig,
  fetcher: typeof fetch = fetch,
): TokenVerifier {
  let cached: Jwk[] | null = null;
  let inFlight: Promise<Jwk[]> | null = null;

  async function fetchKeys(): Promise<Jwk[]> {
    const response = await fetcher(config.jwksUri);
    if (!response.ok) throw new Error(`key set fetch failed with ${response.status}`);
    const body = (await response.json()) as { keys?: Jwk[] };
    return body.keys ?? [];
  }

  /**
   * The cache is keyed on nothing and invalidated by one thing: a `kid` it has
   * never seen. Fetching per request would put a round trip in front of every
   * API call; fetching once and never again would make key rotation an outage
   * that lasts until the Worker is redeployed. Asking the header which key it
   * wants is what distinguishes "rotated" from "forged" without either cost.
   *
   * A token naming a `kid` that genuinely does not exist costs one wasted fetch
   * and is then rejected. That is the correct expense for the rarer case.
   */
  async function keysFor(kid: string | undefined): Promise<Jwk[]> {
    if (cached && (kid === undefined || cached.some((key) => key.kid === kid))) return cached;
    inFlight ??= fetchKeys().finally(() => {
      inFlight = null;
    });
    cached = await inFlight;
    return cached;
  }

  return async (token) => {
    let kid: string | undefined;
    try {
      kid = Jwt.decode(token).header.kid;
    } catch {
      // Not a JWT at all. Nothing to look up, so do not spend a fetch on it.
      return null;
    }

    try {
      const payload = await Jwt.verifyWithJwks(token, {
        keys: await keysFor(kid),
        // Both assertions matter. Without `iss` any Auth0 tenant's token is
        // accepted; without `aud` a token minted for a different API of this
        // same tenant is.
        verification: { iss: config.issuer, aud: config.audience },
        // Pinned, so a token cannot nominate its own weaker algorithm.
        allowedAlgorithms: ['RS256'],
      });
      return typeof payload.sub === 'string' ? { sub: payload.sub } : null;
    } catch {
      return null;
    }
  };
}

export type AuthDeps = {
  db: Db;
  verifyToken: TokenVerifier;
  management: ManagementClient;
};

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, ...rest] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return null;
  const token = rest.join(' ').trim();
  return token.length > 0 ? token : null;
}

export function requireAuth(deps: AuthDeps): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    // One rejection for every cause. Missing, malformed, expired, wrong
    // audience, wrong issuer and unknown-at-the-provider are indistinguishable
    // from outside: a caller learns that it needs credentials, not which part of
    // what it sent was wrong. Middleware is not an `openapi()` handler, so this
    // is a plain response; the 401 declared on the guarded routes documents the
    // shape.
    const reject = (): Response => errorResponse(c, 401, 'unauthorized', 'sign in required');

    const token = bearerToken(c.req.header('authorization'));
    if (!token) return reject();

    const verified = await deps.verifyToken(token);
    if (!verified) return reject();

    // Provisioning happens here, on the first request rather than at sign-up,
    // because there is no sign-up left to hook. A token is the first this
    // application hears of anyone.
    const clientId = await resolveClientId(deps.db, deps.management, verified.sub);
    // The tenant signed this token but no longer has the user — an account
    // deleted while a token was still live. Nothing to resolve to.
    if (!clientId) return reject();

    c.set('clientId', clientId);
    await next();
  };
}
