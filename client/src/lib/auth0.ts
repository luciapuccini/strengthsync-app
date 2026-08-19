/**
 * The tenant this app authenticates against, from
 * `issues/010-auth0-tenant-setup.md`'s recorded values.
 *
 * These three are in git rather than in the environment because none of them is
 * a secret: the domain and audience are served unauthenticated, and the client
 * id travels in every authorize URL the browser opens. They identify the
 * application; they authorize nothing. `server/wrangler.jsonc` keeps the
 * matching server-side values as `vars` for the same reason, and keeping both
 * halves visible is what makes a mismatch between them reviewable.
 *
 * The alternative — three `VITE_AUTH0_*` variables — would move them out of the
 * pre-commit gate and into CI secrets and every contributor's `.env.local`,
 * where a missing one is a runtime failure on the login path that nothing
 * catches until an athlete hits it.
 */
export const AUTH0_DOMAIN = 'auth.strengthsync.ai';
export const AUTH0_CLIENT_ID = 'Mq77c7idugaOidEbinlBecjwKuhJlLPZ';
export const AUTH0_AUDIENCE = 'https://api.strengthsync.ai';
