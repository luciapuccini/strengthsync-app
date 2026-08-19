# 016 — Auth0 migration implementation sweep

## Parent PRD

`issues/auth0-migration/prd.md`

## What to build

A final read over everything issues 010–015 produced, before the first invite
batch is sent. Not new work — an audit, answered in writing.

**Are we on track with what we planned for?** Every decision in the PRD's
*Implementation Decisions* is either shipped or explicitly dropped, with the drop
written down. The four modules the PRD named exist with the boundaries it
described — in particular, identity resolution should still be one call hiding
the lookup, the provisioning fetch, the two-row insert and the race. If it
leaked, say where.

**What diverged from project standards?** Name the files and functions that went
their own way — a payload shape pinned by a test instead of by a Zod schema at
the boundary, a route that does not follow the `createRoute` + `openapi` shape
the rest of `server/src/routes` uses, a client module that grew where the PRD
called for a single fetch wrapper. Note whether each divergence was warranted.

**Are out-of-scope findings documented and not actioned?** Anything spotted
along the way is in `docs/future_state_after_mvp/todos.md` rather than quietly
fixed or quietly forgotten. Two are known in advance and should be there: the
partial-failure gap in account deletion, and the absence of a real transactional
email provider.

**Was `/docs` updated consistently with the progress?** Issue 015 lists the
specific files. Confirm they were actually changed, and that no document still
describes password hashing or the session cookie as current.

**What did the sequencing cost?** This migration deleted the API's ownership
isolation coverage in issue 011 and restored it in 012. Confirm every case in
012's inventory came back, and say plainly whether any was dropped.

**Suggested next steps.** Given what the sweep found, what should happen before
the invite batch — and what the iOS work now needs, given that the PRD closed
the auth blocker and left HealthKit scope, the Apple Developer Program account,
privacy nutrition labels, Guideline 5.1.3 disclosures and age rating open.

## Acceptance criteria

- [ ] Each of the six questions above is answered in writing
- [ ] Every PRD implementation decision is marked shipped or dropped, drops
      justified
- [ ] Divergences from project conventions are listed with file and function
- [ ] Out-of-scope findings live in `docs/future_state_after_mvp/todos.md`, not
      in this issue
- [ ] Issue 012's restored-coverage inventory is confirmed complete, or the gaps
      are named
- [ ] The doc updates from issue 015 have actually been made
- [ ] Next steps are proposed, not decided

## Blocked by

- Blocked by `issues/010-auth0-tenant-setup.md`
- Blocked by `issues/011-amputate-old-auth.md`
- Blocked by `issues/012-token-verification-and-provisioning.md`
- Blocked by `issues/013-web-app-universal-login.md`
- Blocked by `issues/014-account-deletion.md`
- Blocked by `issues/015-reconcile-docs-and-launch-checklist.md`

## User stories addressed

- All of `issues/auth0-migration/prd.md`

## STATUS

TODO
