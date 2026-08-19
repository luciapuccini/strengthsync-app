import { describe, expect, it } from 'vitest';

import { createTokenVerifier } from './auth.ts';

/**
 * The key-set cache, which is the part of `createTokenVerifier` that holds
 * state and therefore the part worth pinning.
 *
 * Signature verification itself is deliberately not covered — see the note on
 * `createTokenVerifier`, and the trade recorded in
 * `issues/auth0-migration/prd.md`. Every token below is refused, because none of
 * them is signed by anything. What is asserted is *how many times the key set
 * was fetched before they were refused*, which needs no cryptography at all.
 */

const JWKS_URI = 'https://auth.example.test/.well-known/jwks.json';

const config = {
  issuer: 'https://auth.example.test/',
  audience: 'https://api.example.test',
  jwksUri: JWKS_URI,
};

const b64url = (value: unknown): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Syntactically a JWT, signed by nothing. Enough to carry a `kid`. */
const tokenWithKid = (kid: string): string =>
  `${b64url({ alg: 'RS256', typ: 'JWT', kid })}.${b64url({ sub: 'auth0|ana' })}.not-a-signature`;

const key = (kid: string) => ({ kid, kty: 'RSA', alg: 'RS256', use: 'sig', e: 'AQAB', n: 'xGY' });

function setup(keysFor: (call: number) => unknown[]) {
  let calls = 0;
  const fetcher = (async () => {
    calls += 1;
    return new Response(JSON.stringify({ keys: keysFor(calls) }), {
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { verify: createTokenVerifier(config, fetcher), fetches: () => calls };
}

describe('the token verifier key set', () => {
  it('fetches the key set once and reuses it for tokens naming the same key', async () => {
    const { verify, fetches } = setup(() => [key('a')]);

    await verify(tokenWithKid('a'));
    await verify(tokenWithKid('a'));
    await verify(tokenWithKid('a'));

    // Fetching per request would put a round trip in front of every API call.
    expect(fetches()).toBe(1);
  });

  it('refetches when a token names a key it has not seen', async () => {
    // Key rotation. Caching forever would make it an outage lasting until the
    // Worker is next deployed, which is not a thing anyone would connect to the
    // cause.
    const { verify, fetches } = setup((call) => (call === 1 ? [key('a')] : [key('a'), key('b')]));

    await verify(tokenWithKid('a'));
    expect(fetches()).toBe(1);

    await verify(tokenWithKid('b'));
    expect(fetches()).toBe(2);

    // And the refreshed set is what is cached from then on.
    await verify(tokenWithKid('b'));
    expect(fetches()).toBe(2);
  });

  it('fetches once when several requests arrive on a cold verifier', async () => {
    const { verify, fetches } = setup(() => [key('a')]);

    await Promise.all([verify(tokenWithKid('a')), verify(tokenWithKid('a'))]);

    expect(fetches()).toBe(1);
  });

  it('spends no fetch on something that is not a JWT', async () => {
    const { verify, fetches } = setup(() => [key('a')]);

    await expect(verify('not-a-jwt')).resolves.toBeNull();
    await expect(verify('')).resolves.toBeNull();

    // Garbage is free to reject. Otherwise anyone could drive the tenant's JWKS
    // endpoint by sending nonsense.
    expect(fetches()).toBe(0);
  });

  it('refuses a token it cannot verify, however well-formed', async () => {
    const { verify } = setup(() => [key('a')]);

    await expect(verify(tokenWithKid('a'))).resolves.toBeNull();
  });
});
