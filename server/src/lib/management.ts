/**
 * The Auth0 Management API, reduced to the two things this application asks of
 * it. See docs/architecture/auth.md.
 *
 * What it hides is the point: machine-to-machine token acquisition, caching that
 * token until it expires, the two different hostnames involved, and the mapping
 * from HTTP status to something a caller can branch on. Callers pass a subject
 * and get an answer.
 *
 * The M2M application backing this is scoped to `read:users` and `delete:users`
 * and nothing else (`issues/010-auth0-tenant-setup.md`). It deliberately cannot
 * create users — the operator does that in the dashboard — so there is no
 * `createUser` here to leave lying around.
 */

/** The fields provisioning needs. The Management API returns a great deal more. */
export type ManagementUser = {
  subject: string;
  email: string;
  name: string;
};

export type ManagementClient = {
  /** The user behind a subject, or null if the provider has no such user. */
  getUser(subject: string): Promise<ManagementUser | null>;
  deleteUser(subject: string): Promise<void>;
};

export type ManagementConfig = {
  /**
   * Where tokens are minted — the custom domain, so this call looks like every
   * other one the tenant serves.
   */
  issuerDomain: string;
  /**
   * Where the Management API lives, and its audience. The *tenant* domain, not
   * the custom one: the Management API audience is not customisable, so this is
   * the one place the vendor hostname is unavoidable.
   */
  tenantDomain: string;
  clientId: string;
  clientSecret: string;
  /** Injected by tests; the Worker's global `fetch` is the right answer live. */
  fetch?: typeof fetch;
  /** Injected by tests, so token expiry is exercised without waiting for it. */
  now?: () => number;
};

export class ManagementError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ManagementError';
    this.status = status;
  }
}

/**
 * Refresh this far before the token actually expires. A token that is valid when
 * the request leaves and expired when it arrives is a 401 that looks like a bug
 * in the guard rather than a clock.
 */
const EXPIRY_MARGIN_MS = 60_000;

export function createManagementClient(config: ManagementConfig): ManagementClient {
  const doFetch = config.fetch ?? fetch;
  const now = config.now ?? Date.now;
  const apiBase = `https://${config.tenantDomain}/api/v2`;

  let cached: { token: string; expiresAt: number } | null = null;
  /**
   * The mint in flight, if there is one. Without this, a cold Worker taking
   * several requests at once mints a token per request — each one valid, each
   * one counting against the tenant's rate limit, and all but one discarded.
   */
  let inFlight: Promise<string> | null = null;

  async function mintToken(): Promise<string> {
    const response = await doFetch(`https://${config.issuerDomain}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        audience: `${apiBase}/`,
        grant_type: 'client_credentials',
      }),
    });
    if (!response.ok) {
      // Deliberately does not echo the body: a failed client-credentials
      // exchange can quote back what was sent.
      throw new ManagementError(response.status, 'could not obtain a management token');
    }
    const body = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!body.access_token) {
      throw new ManagementError(response.status, 'management token response carried no token');
    }
    cached = {
      token: body.access_token,
      expiresAt: now() + (body.expires_in ?? 0) * 1000 - EXPIRY_MARGIN_MS,
    };
    return body.access_token;
  }

  async function token(): Promise<string> {
    if (cached && now() < cached.expiresAt) return cached.token;
    inFlight ??= mintToken().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  async function call(method: string, path: string): Promise<Response> {
    return doFetch(`${apiBase}${path}`, {
      method,
      headers: { authorization: `Bearer ${await token()}` },
    });
  }

  return {
    async getUser(subject) {
      const response = await call('GET', `/users/${encodeURIComponent(subject)}`);
      // A subject with no user is ordinary rather than exceptional: a token
      // outlives the account it names, so this is what a request from someone
      // deleted in issue 014 looks like.
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new ManagementError(response.status, 'management API rejected the user lookup');
      }
      const user = (await response.json()) as { user_id?: string; email?: string; name?: string };
      if (!user.email) {
        throw new ManagementError(response.status, 'management API returned a user with no email');
      }
      return {
        subject: user.user_id ?? subject,
        email: user.email,
        // Auth0 falls back to the email address for `name` on a
        // password-connection user created without one. Mirroring that keeps
        // `display_name` non-empty, which the domain schema requires.
        name: user.name ?? user.email,
      };
    },

    async deleteUser(subject) {
      const response = await call('DELETE', `/users/${encodeURIComponent(subject)}`);
      // Already gone is the desired end state, so a 404 is a success. Deletion
      // is retried by hand if it fails, and the second attempt must not error.
      if (response.ok || response.status === 404) return;
      throw new ManagementError(response.status, 'management API rejected the user deletion');
    },
  };
}
