import type { MiddlewareHandler } from 'hono';
import { Jwt } from 'hono/utils/jwt';

import type { Db } from '../db/index.ts';

import { errorResponse } from './errors.ts';
import { resolveClientId } from './identity.ts';
import type { ManagementClient } from './management.ts';

export type AuthVariables = { clientId: string };

export type VerifiedToken = { sub: string };

export type TokenVerifier = (token: string) => Promise<VerifiedToken | null>;

export type AuthConfig = {
  issuer: string;
  audience: string;
  jwksUri: string;
};

type Jwk = JsonWebKey & { kid?: string };

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
      return null;
    }

    try {
      const payload = await Jwt.verifyWithJwks(token, {
        keys: await keysFor(kid),
        verification: { iss: config.issuer, aud: config.audience },
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
    const reject = (): Response => errorResponse(c, 401, 'unauthorized', 'sign in required');

    const token = bearerToken(c.req.header('authorization'));
    if (!token) return reject();

    const verified = await deps.verifyToken(token);
    if (!verified) return reject();

    const clientId = await resolveClientId(deps.db, deps.management, verified.sub);
    if (!clientId) return reject();

    c.set('clientId', clientId);
    await next();
  };
}
