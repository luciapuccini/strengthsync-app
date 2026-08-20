# 015 — Reconcile the docs and the launch checklist

## Parent PRD

`issues/auth0-migration/prd.md`

## What to build

No code. This migration deliberately contradicts shipped work and shipped
documentation, and the contradictions are now load-bearing: `stack.md` describes
an access model that no longer exists, and `008-launch-readiness.md` instructs a
tester to do something that is no longer possible.

**`docs/architecture/stack.md`.** The stack table's *Product access* row and the
whole *Access: client accounts with signed session cookies* section describe
PBKDF2 iteration counts, a `client_credentials` table and a `SameSite=Lax`
cookie, none of which exist. `docs/architecture/auth.md` supersedes that section;
stack.md should carry a one-line row and a pointer, not a second description
that can drift. The post-MVP auth notes at the end lose their subject.

**`docs/architecture/api_contracts.md`.** The `/auth/*` bullets, the Session row
in the operations table, and the authentication-phase history all describe
routes that were deleted in issue 011. The history is worth keeping as history —
it should say the phase was superseded, not be rewritten as though it never
happened.

**`issues/008-launch-readiness.md`.** Its real-phone run says "sign up with a
code", which no longer describes any flow; the run is now sign in on the hosted
page. Its completed criterion about setting the batch-one invite code as a
Worker secret is moot and should be struck with a note rather than unticked.

**`docs/future_state_after_mvp/todos.md`.** Four entries leave, because they
shipped as part of the provider rather than as work: password reset, SSO /
social sign-in, showing the password in the field, and the captcha-or-gate
question against fake users.

**`docs/future_state_after_mvp/ios-bootstrap-brief.md`.** The brief already
records the answers to the deleted `ios.md`'s first two questions. What it needs
from this issue is the cross-reference in the other direction: that
`issues/014-account-deletion.md` closed Guideline 5.1.1(v), which is the only
store requirement the auth work settles.

**`docs/mvp.md`.** Wherever §2 describes the invite gate as the access control,
it now describes a mechanism that was deleted rather than replaced.

## Acceptance criteria

- [ ] `stack.md`'s access section points at `docs/architecture/auth.md` instead
      of describing a superseded design
- [ ] `api_contracts.md` no longer documents `/auth/*` as live routes, and its
      phase history records the supersession rather than erasing it
- [ ] `008-launch-readiness.md`'s phone run describes signing in, and its
      invite-code criterion is struck with a note
- [ ] The four superseded entries are gone from `todos.md`
- [ ] `ios-bootstrap-brief.md` records that issue 014 closed Guideline
      5.1.1(v), and that the rest of store compliance is still open
- [ ] `docs/mvp.md` no longer presents the invite code as the access gate
- [ ] No document still describes password hashing or the session cookie as
      current

## Blocked by

- Blocked by `issues/014-account-deletion.md`

## User stories addressed

- User story 42

## STATUS

TODO
