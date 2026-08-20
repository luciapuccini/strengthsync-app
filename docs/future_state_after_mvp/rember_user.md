---
name: Remember Device Cookie
overview: SUPERSEDED TWICE, and kept only as history. Proposed extending Basic Auth with a 30-day signed HttpOnly cookie; the authentication phase (issues/auth) shipped the cookie and retired Basic instead of layering on it; the Auth0 migration (issues/010-016) then deleted the cookie, the password hashing and SESSION_JWT_SECRET as well. Nothing described below is current — see docs/architecture/auth.md.
todos:
  - id: cookie-middleware
    content: Implement signed 30-day cookie middleware with Basic Auth fallback
    status: superseded
  - id: auth-config
    content: Wire AUTH_SESSION_SECRET through Worker and tests
    status: superseded
  - id: auth-tests
    content: Test issuance, cookie-only access, expiry, and tampering
    status: superseded
  - id: auth-docs-verify
    content: Document secret setup and run full verification
    status: superseded
isProject: false
---

# Remember-device authentication

> **Superseded by `issues/auth` (the authentication phase).** This note is kept
> for the reasoning it settled, not as work to do. Read it as the design that
> the shipped one grew out of.
>
> **Adopted from it, more or less unchanged:**
>
> - The cookie shape: signed, `HttpOnly`, `SameSite=Lax`, path-wide, `Secure` outside development. No browser storage.
> - The thirty-day lifetime.
> - No sessions table in D1. The token is self-contained and verified by signature, so signing in costs no read and there is no server-side state to expire.
> - Middleware location: one guard mounted in `app.ts`, with `/health` outside it.
> - A signing secret separate from any password, wired through the Worker env and the test kit.
> - The test list — issuance, cookie-only access, expiry, tampering — which is close to what `app.auth.test.ts` asserts today.
>
> **Where it diverged, and why:**
>
> - **The payload carries identity.** This note's cookie proved only that *a* valid Basic login had happened; the shipped one carries the athlete's id as the JWT `sub`, which is what lets the API address data by session instead of by a URL parameter. That single change is what turned the cookie from a convenience into the authentication mechanism.
> - **Basic is retired, not kept as a fallback.** With per-athlete accounts there is no shared credential left to fall back to. `/auth/sign-up` and `/auth/sign-in` replace it, backed by PBKDF2 hashes in `client_credentials`, and sign-out actually ends a session — which Basic could never do.
> - **HS256 JWTs via `hono/jwt`**, rather than a hand-rolled versioned signed payload. Same properties, no new dependency, and one less format to get wrong.
> - **The guard has no development exemption.** The Basic middleware it replaced was mounted only when `NODE_ENV=production`; the session guard runs everywhere, so the guard under `wrangler dev` is the guard in production.
> - **Names.** `AUTH_SESSION_SECRET` → `SESSION_JWT_SECRET`; `server/src/middleware/auth.ts` → `server/src/lib/session.ts` and `session-token.ts`; the cookie is `session`, not `strengthsync_session`.
>
> The file paths referenced below are from the original proposal and several no
> longer exist. See [stack.md](../architecture/stack.md) for what is actually built.

- Add a focused auth middleware in [`server/src/middleware/auth.ts`](server/src/middleware/auth.ts) that:
  - accepts a valid, unexpired signed `strengthsync_session` cookie;
  - otherwise validates the existing Basic Authorization header;
  - after successful Basic authentication, sets a 30-day `HttpOnly`, `SameSite=Lax`, path-wide cookie (`Secure` on HTTPS);
  - signs a versioned payload containing its expiry and rejects malformed, expired, or tampered cookies.
- Replace Hono’s direct `basicAuth` registration in [`server/src/app.ts`](server/src/app.ts) with the new middleware. `/health` behavior remains unchanged.
- Add `AUTH_SESSION_SECRET` to [`server/src/env.ts`](server/src/env.ts), Worker construction in [`server/src/index.ts`](server/src/index.ts), and test configuration in [`server/src/testkit.ts`](server/src/testkit.ts). Keep the signing key separate from the Basic password.
- Extend [`server/src/app.public.test.ts`](server/src/app.public.test.ts) to verify cookie issuance, cookie-only access, and rejection of tampered/expired cookies while retaining existing Basic Auth tests.
- Update the auth documentation/checkpoint to describe the persistent cookie and required secret. Before deployment, configure `AUTH_SESSION_SECRET` locally in `.dev.vars` and remotely with `wrangler secret put AUTH_SESSION_SECRET`.
- Run typecheck, lint, tests, UI build, then verify locally that the first Basic login sets the cookie and a fresh browser session can call `/api/*` without another prompt.
