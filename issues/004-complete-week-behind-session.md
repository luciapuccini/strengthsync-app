# 004 — Move complete-week behind the session guard

## Parent PRD

`docs/mvp.md`

## What to build

`POST /wf/complete-week` is unauthenticated and takes `clientId` from the request
body, then calls `STRENGTHSYNC_WORKFLOW.create` with it. On a public domain that
means any caller can complete a stranger's in-flight week — freezing their log
and replacing next week — at a cost of two to three paid model calls, and can
spawn unbounded workflow instances with random UUIDs before any lookup fails.

Mount the route under `/api/*` so `requireSession` covers it (see
`server/src/app.ts`), read the athlete from the session cookie, and drop
`clientId` from the request body entirely. That also removes the last place a
`clientId` crosses the wire, an anomaly `docs/architecture/api_contracts.md`
already flags.

`client/src/api/workflows.ts` loses the argument it passes today. The route
declares `security: []` and has no 401 response; both go.

The contract changes, so `server/openapi.json` and
`client/src/api/openapi.d.ts` must be regenerated or CI fails on the
`git diff --exit-code` guard.

See `docs/mvp.md` §4.

## Acceptance criteria

- [x] The route is reachable only with a valid session cookie; without one it
      returns 401 and creates no workflow instance
- [x] The request body no longer carries `clientId`; the handler reads it from
      the session
- [x] `startWeeklyProgression` in `client/src/api/workflows.ts` takes no client
      id, and every caller is updated
- [x] `pnpm gen:openapi` re-run and `git diff --exit-code` clean
- [x] `docs/architecture/api_contracts.md` no longer describes this as a known
      MVP gap
- [x] Completing a week still works end to end from the tracker

## Blocked by

None — can start immediately.

## PRD sections addressed

- Scope item 4 (`complete-week` behind the session guard)

## STATUS

DONE
