import { describe, expect, it } from 'vitest';

import { ManagementError, createManagementClient } from './management.ts';

/**
 * The Management API client, against a stubbed fetch. Nothing here touches the
 * network — the client exists so that the token lifecycle has one home, and this
 * file is where that lifecycle is actually exercised.
 */

const ISSUER = 'auth.example.test';
const TENANT = 'tenant.us.auth0.test';
const TOKEN_URL = `https://${ISSUER}/oauth/token`;
// The issuer, not the tenant. Auth0 refuses a token at a host that did not mint
// it, so the audience being the tenant domain says nothing about where the call
// goes. This pair used to disagree, every lookup came back 401, and these tests
// passed throughout — they asserted the behaviour rather than the requirement.
const USERS_URL = `https://${ISSUER}/api/v2/users`;

const SUBJECT = 'auth0|68a1f3c0d2b4e5f6a7b8c9d0';

type Call = { url: string; method: string; authorization: string | null; body: unknown };

function stubFetch(routes: (call: Call) => Response) {
  const calls: Call[] = [];
  const fetcher = (async (
    input: unknown,
    init?: { method?: string; headers?: unknown; body?: unknown },
  ) => {
    const headers = new Headers((init?.headers ?? {}) as HeadersInit);
    const call: Call = {
      url: String(input),
      method: init?.method ?? 'GET',
      authorization: headers.get('authorization'),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    };
    calls.push(call);
    return routes(call);
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const tokenBody = (token: string, expiresIn = 86400) => ({
  access_token: token,
  expires_in: expiresIn,
  token_type: 'Bearer',
});

const userBody = (over: Record<string, unknown> = {}) => ({
  user_id: SUBJECT,
  email: 'ana@example.test',
  name: 'Ana',
  ...over,
});

function setup(routes: (call: Call) => Response, now: () => number = () => 0) {
  const { fetcher, calls } = stubFetch(routes);
  const client = createManagementClient({
    issuerDomain: ISSUER,
    tenantDomain: TENANT,
    clientId: 'm2m-client-id',
    clientSecret: 'm2m-client-secret',
    fetch: fetcher,
    now,
  });
  return { client, calls };
}

const happyPath = (call: Call): Response =>
  call.url === TOKEN_URL ? json(tokenBody('token-1')) : json(userBody());

describe('management client', () => {
  it('mints a token against the tenant audience and sends it as a bearer', async () => {
    const { client, calls } = setup(happyPath);

    await client.getUser(SUBJECT);

    expect(calls[0]?.url).toBe(TOKEN_URL);
    expect(calls[0]?.body).toEqual({
      client_id: 'm2m-client-id',
      client_secret: 'm2m-client-secret',
      // The tenant domain, not the custom one. The Management API audience is
      // not customisable, and getting this wrong is a 401 with no useful text.
      audience: `https://${TENANT}/api/v2/`,
      grant_type: 'client_credentials',
    });
    expect(calls[1]?.authorization).toBe('Bearer token-1');
  });

  it('spends the token at the host that minted it', async () => {
    const { client, calls } = setup(happyPath);

    await client.getUser(SUBJECT);

    // The one invariant the audience assertion above cannot express: a correct
    // audience with the wrong host is a 401 that reads exactly like a bad
    // secret. Both calls must leave for the same origin.
    expect(new URL(calls[0]!.url).origin).toBe(new URL(calls[1]!.url).origin);
    expect(new URL(calls[1]!.url).host).toBe(ISSUER);
    expect(calls[1]?.url).not.toContain(TENANT);
  });

  it('reuses the token across calls rather than minting one per request', async () => {
    const { client, calls } = setup(happyPath);

    await client.getUser(SUBJECT);
    await client.getUser(SUBJECT);
    await client.getUser(SUBJECT);

    expect(calls.filter((call) => call.url === TOKEN_URL)).toHaveLength(1);
  });

  it('mints a fresh token once the cached one is close to expiring', async () => {
    let clock = 0;
    let minted = 0;
    const { client, calls } = setup(
      (call) =>
        call.url === TOKEN_URL ? json(tokenBody(`token-${++minted}`, 120)) : json(userBody()),
      () => clock,
    );

    await client.getUser(SUBJECT);
    // Inside the 60s safety margin ahead of the 120s expiry, so the cached token
    // is already considered spent even though it has not technically expired.
    clock = 70_000;
    await client.getUser(SUBJECT);

    expect(calls.filter((call) => call.url === TOKEN_URL)).toHaveLength(2);
    expect(calls.at(-1)?.authorization).toBe('Bearer token-2');
  });

  it('mints once when several requests arrive on a cold client', async () => {
    const { client, calls } = setup(happyPath);

    await Promise.all([client.getUser(SUBJECT), client.getUser(SUBJECT), client.getUser(SUBJECT)]);

    expect(calls.filter((call) => call.url === TOKEN_URL)).toHaveLength(1);
  });

  it('returns null for a subject the provider has no user for', async () => {
    const { client } = setup((call) =>
      call.url === TOKEN_URL ? json(tokenBody('token-1')) : json({ statusCode: 404 }, 404),
    );

    await expect(client.getUser(SUBJECT)).resolves.toBeNull();
  });

  it('url-encodes the subject, which carries a pipe', async () => {
    const { client, calls } = setup(happyPath);

    await client.getUser(SUBJECT);

    expect(calls[1]?.url).toBe(`${USERS_URL}/${encodeURIComponent(SUBJECT)}`);
    expect(calls[1]?.url).toContain('%7C');
  });

  it('falls back to the email when the provider has no name for the user', async () => {
    const { client } = setup((call) =>
      call.url === TOKEN_URL ? json(tokenBody('token-1')) : json(userBody({ name: undefined })),
    );

    // `display_name` is `z.string().min(1)` in the domain model, so an athlete
    // created without a name has to arrive as something.
    await expect(client.getUser(SUBJECT)).resolves.toMatchObject({ name: 'ana@example.test' });
  });

  it('raises rather than inventing an athlete when the lookup fails', async () => {
    const { client } = setup((call) =>
      call.url === TOKEN_URL ? json(tokenBody('token-1')) : json({ statusCode: 429 }, 429),
    );

    await expect(client.getUser(SUBJECT)).rejects.toBeInstanceOf(ManagementError);
  });

  it('does not put the client secret into the error when the mint is rejected', async () => {
    const { client } = setup(() => json({ error: 'access_denied' }, 401));

    await expect(client.getUser(SUBJECT)).rejects.toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('m2m-client-secret') }),
    );
  });

  it('treats an already-deleted user as a successful deletion', async () => {
    const { client } = setup((call) =>
      call.url === TOKEN_URL ? json(tokenBody('token-1')) : json({ statusCode: 404 }, 404),
    );

    // Deletion is retried by hand when it fails, and the retry must not error.
    await expect(client.deleteUser(SUBJECT)).resolves.toBeUndefined();
  });

  it('raises when the provider refuses the deletion', async () => {
    const { client } = setup((call) =>
      call.url === TOKEN_URL ? json(tokenBody('token-1')) : json({ statusCode: 403 }, 403),
    );

    await expect(client.deleteUser(SUBJECT)).rejects.toBeInstanceOf(ManagementError);
  });
});
