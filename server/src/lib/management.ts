export type ManagementUser = {
  subject: string;
  email: string;
  name: string;
};

export type ManagementClient = {
  getUser(subject: string): Promise<ManagementUser | null>;
  deleteUser(subject: string): Promise<void>;
};

export type ManagementConfig = {
  issuerDomain: string;
  tenantDomain: string;
  clientId: string;
  clientSecret: string;
  fetch?: typeof fetch;
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

const EXPIRY_MARGIN_MS = 60_000;

export function createManagementClient(config: ManagementConfig): ManagementClient {
  const doFetch = config.fetch ?? fetch;
  const now = config.now ?? Date.now;
  const apiAudience = `https://${config.tenantDomain}/api/v2/`;
  const apiBase = `https://${config.issuerDomain}/api/v2`;

  let cached: { token: string; expiresAt: number } | null = null;
  let inFlight: Promise<string> | null = null;

  async function mintToken(): Promise<string> {
    const response = await doFetch(`https://${config.issuerDomain}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        audience: apiAudience,
        grant_type: 'client_credentials',
      }),
    });
    if (!response.ok) {
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
        name: user.name ?? user.email,
      };
    },

    async deleteUser(subject) {
      const response = await call('DELETE', `/users/${encodeURIComponent(subject)}`);
      if (response.ok || response.status === 404) return;
      throw new ManagementError(response.status, 'management API rejected the user deletion');
    },
  };
}
