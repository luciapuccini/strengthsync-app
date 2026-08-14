# 001 — Serve the app from app.strengthsync.ai

## Parent PRD

`docs/mvp.md`

## What to build

Put the Worker on its own hostname so invited users have a URL to open, and
confirm the two production facts the rest of the MVP assumes are true.

`strengthsync.ai` already runs on Cloudflare nameservers, so this is a `routes`
entry with `custom_domain: true` in `server/wrangler.jsonc` — no DNS migration
and no registrar work. The apex keeps serving the marketing site from the other
repository.

Two checks ride along because they can only be answered once something is
deployed, and both are cheap:

- The session cookie's `secure` flag comes from `process.env.NODE_ENV`
  (`server/src/lib/session.ts:29`), which is not a Workers runtime value —
  wrangler substitutes it at build time. Verify against the deployed Worker
  rather than assuming.
- The `database_id` in `server/wrangler.jsonc` still describes itself as a
  local-dev placeholder. Deploys run `db:migrate:remote` and have been passing,
  so the id is almost certainly correct and the comment is stale — confirm, then
  fix the comment either way.

See `docs/mvp.md` §1 and the first two pre-launch checks.

## Acceptance criteria

- [ ] `https://app.strengthsync.ai` serves the SPA, and `/health` responds on
      that host
- [ ] `https://strengthsync.ai` still serves the marketing site, unchanged
- [ ] Signing in on the deployed host sets a session cookie carrying both
      `Secure` and `HttpOnly`; if it does not, `session.ts` is fixed to set
      `secure` unconditionally rather than from `process.env`
- [ ] The `database_id` is confirmed to point at the production D1 database and
      its comment no longer calls itself a placeholder
- [ ] The cookie has no `domain` attribute, so it stays host-only and never
      reaches the apex

## Blocked by

None — can start immediately.

## PRD sections addressed

- Scope item 1 (Domain)
- Pre-launch checks: session cookie `Secure`, production D1 binding

## STATUS

TODO
