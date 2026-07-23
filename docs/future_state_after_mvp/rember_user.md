---
name: Remember Device Cookie
overview: Extend Basic Auth with a 30-day signed HttpOnly cookie, preserving Basic credentials as the initial/fallback login method without browser storage or D1 sessions.
todos:
  - id: cookie-middleware
    content: Implement signed 30-day cookie middleware with Basic Auth fallback
    status: pending
  - id: auth-config
    content: Wire AUTH_SESSION_SECRET through Worker and tests
    status: pending
  - id: auth-tests
    content: Test issuance, cookie-only access, expiry, and tampering
    status: pending
  - id: auth-docs-verify
    content: Document secret setup and run full verification
    status: pending
isProject: false
---

# Remember-device authentication

- Add a focused auth middleware in [`apps/api/src/middleware/auth.ts`](apps/api/src/middleware/auth.ts) that:
  - accepts a valid, unexpired signed `strengthsync_session` cookie;
  - otherwise validates the existing Basic Authorization header;
  - after successful Basic authentication, sets a 30-day `HttpOnly`, `SameSite=Lax`, path-wide cookie (`Secure` on HTTPS);
  - signs a versioned payload containing its expiry and rejects malformed, expired, or tampered cookies.
- Replace Hono’s direct `basicAuth` registration in [`apps/api/src/app.ts`](apps/api/src/app.ts) with the new middleware. `/health` and `/internal/*` behavior remains unchanged.
- Add `AUTH_SESSION_SECRET` to [`apps/api/src/env.ts`](apps/api/src/env.ts), Worker construction in [`apps/api/src/index.ts`](apps/api/src/index.ts), and test configuration in [`apps/api/src/testkit.ts`](apps/api/src/testkit.ts). Keep the signing key separate from the Basic password.
- Extend [`apps/api/src/app.public.test.ts`](apps/api/src/app.public.test.ts) to verify cookie issuance, cookie-only access, and rejection of tampered/expired cookies while retaining existing Basic Auth tests.
- Update the auth documentation/checkpoint to describe the persistent cookie and required secret. Before deployment, configure `AUTH_SESSION_SECRET` locally in `.dev.vars` and remotely with `wrangler secret put AUTH_SESSION_SECRET`.
- Run typecheck, lint, tests, UI build, then verify locally that the first Basic login sets the cookie and a fresh browser session can call `/api/*` without another prompt.
