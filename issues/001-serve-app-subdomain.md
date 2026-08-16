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

- [x] `https://app.strengthsync.ai` serves the SPA, and `/health` responds on
      that host
- [x] `https://strengthsync.ai` still serves the marketing site, unchanged
- [x] Signing in on the deployed host sets a session cookie carrying both
      `Secure` and `HttpOnly`; if it does not, `session.ts` is fixed to set
      `secure` unconditionally rather than from `process.env`
- [x] The `database_id` is confirmed to point at the production D1 database and
      its comment no longer calls itself a placeholder
- [x] The cookie has no `domain` attribute, so it stays host-only and never
      reaches the apex

## What was found

**The `database_id` is real.** `wrangler d1 info strengthsync` returns
`3d9980fa-e3f2-4a19-9dac-1c63db6132a6`, seven tables, 233 kB — the id in
`wrangler.jsonc`. The comment was stale and now says what the id is and why
local dev cannot tell you it is wrong.

**`Secure` was correct by accident.** Built with `wrangler deploy --dry-run
--outdir`, `process.env.NODE_ENV === 'production'` compiled to a literal
`secure: true` — but the same build with `NODE_ENV=development` in the shell
compiled to `secure: false`. Nothing in CI sets `NODE_ENV`, so production was
protected, by a default rather than by a decision, with no runtime signal if it
ever flipped. `session.ts` now sets `secure: true` unconditionally; browsers
treat `http://localhost` as a trustworthy origin, so `wrangler dev` still
receives the cookie. That was the last `NODE_ENV` read in the auth path, and the
two environment-split tests collapse into one, plus a new test pinning the
absent `Domain` on both the issued and the cleared cookie.

## Blocked by

None — can start immediately.

## PRD sections addressed

- Scope item 1 (Domain)
- Pre-launch checks: session cookie `Secure`, production D1 binding

## STATUS

DONE