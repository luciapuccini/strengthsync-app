## Parent PRD

`issues/prd.md`

## What to build

The end-to-end public/private routing spine for the landing experience, with
placeholder pages. This is the tracer bullet: after this slice the whole
structure is navigable and the auth boundary works, even though the auth screens
are still bare.

- Add a dummy auth module exposing a hardcoded `IS_AUTHENTICATED` flag (default
  `false`) and a `DEMO_CLIENT_ID` constant (reuse the demo id already hardcoded in
  the current header). Mark both with a `// TODO` for real session logic, and add a
  `// TODO` noting the guard/redirect behavior should get router-level tests once
  real auth state is wired.
- Add a `RequireAuth` guard that redirects unauthenticated users to `/sign-in`.
- Add a `RootRedirect` for `/`: authenticated → `/clients/${DEMO_CLIENT_ID}/track`,
  otherwise → `/sign-in`.
- Add a minimal `PublicLayout` (plain `Outlet`, no chrome yet) for the public routes.
- Refactor the existing `Layout` into `AppLayout` (no behavior change) and use it for
  the private routes, guarded by `RequireAuth`.
- Add stub `/sign-in` and `/sign-up` pages (a heading only).
- Remove the `routes/home/home.tsx` stub.

See the "Route map", "Auth boundary (dummy)", and "Layouts" sections of the parent
PRD.

## Acceptance criteria

- [ ] `/` redirects to `/sign-in` when logged out and to `/clients/<demo id>/track` when the flag is flipped to `true`.
- [ ] Visiting a private route (`/clients`, `/clients/:clientId/track`, `/clients/:clientId/plans/:planId/history`) while logged out redirects to `/sign-in`.
- [ ] `/sign-in` and `/sign-up` render their placeholder headings inside `PublicLayout`.
- [ ] Private routes render inside `AppLayout` with unchanged header/nav behavior.
- [ ] `routes/home/home.tsx` is removed and no longer referenced.
- [ ] `IS_AUTHENTICATED`, `DEMO_CLIENT_ID`, and the test `// TODO` seam are in one obvious module.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

None - can start immediately.

## User stories addressed

Reference by number from the parent PRD:

- User story 14
- User story 15
- User story 16
- User story 17
- User story 18
