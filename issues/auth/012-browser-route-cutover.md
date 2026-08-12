## Parent PRD

`issues/auth/prd.md`

## What to build

The URL shape catches up with the API: no browser route carries an athlete or a
plan identifier any more.

- The tracker route loses its athlete id segment; the history route loses both its
  athlete id and its plan id.
- The root redirect targets the tracker directly.
- The header's history link — currently two hardcoded identifiers with a warning
  comment about awaiting auth — becomes a static link.
- The history page resolves the signed-in athlete's active plan itself rather than
  receiving a plan id, and loads that plan's completed weeks.

The trade-off, accepted in the PRD: there is no longer a URL for an archived
plan's history. No screen offers one today either.

Optionally, this is the natural moment to add the router-level guard tests that
the deleted dummy authentication module asked for — driving the guard and the root
redirect through a memory router. They are worth having but are not a blocker.

See the "Routing and screens" section of the parent PRD.

## Acceptance criteria

- [ ] The route table is the root redirect, sign-in, sign-up, tracker, history and not-found — and nothing else.
- [ ] No browser route pattern contains an athlete or plan identifier.
- [ ] Opening the root while signed in lands on the tracker; while signed out, on sign-in.
- [ ] The header's history link is static, and both hardcoded identifiers and the warning comment are gone.
- [ ] The history page resolves the active plan itself and renders that plan's completed weeks.
- [ ] Navigating between the tracker and history works in both directions without a full reload.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/auth/011-client-cutover-to-me.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 17
- User story 18
- User story 32
