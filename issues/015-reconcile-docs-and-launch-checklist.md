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

## Found while reconciling — for issue 016, not fixed here

Recorded rather than actioned, because credential rotation lands immediately
before the manual end-to-end run with real users and doing it mid-documentation
would invalidate a working local setup for no reason.

### Credentials — rotate as the last step of 016

1. **The live M2M client secret is committed.** `010-auth0-tenant-setup.md` step
   10 pastes `"client_secret":"Fo9h…"` inline. Verified on 2026-08-20 to be
   byte-identical to the value in `server/.dev.vars`, so it is the **currently
   active** secret, not a stale one. It has been tracked since `399c40d` and is
   in git history, so deleting the line is not sufficient.

   This contradicts issue 010's own acceptance criterion — *"The M2M client
   secret is set via `wrangler secret` and appears in no file"* — which is
   ticked. Untick it when the rotation lands.

   Rotate at Applications → StrengthSync Management → Settings → Rotate, then
   `wrangler secret put AUTH0_M2M_CLIENT_SECRET`, then `server/.dev.vars`, then
   scrub the issue file. The secret can read and delete every user in the
   tenant.

2. **A literal Management token is pasted in the same step.** Expired, and
   lower-stakes than the secret, but it should not have been committed either.
   Both were re-pasted in `5cdfcfa`/`399c40d` rather than being a single early
   mistake, which suggests the habit is copy-the-working-command — worth
   breaking before the invite batch.

3. **`SESSION_JWT_SECRET` and `INVITE_CODE` are dead Worker secrets.** Issue 011
   deleted the code that read them; nothing deleted the secrets themselves.
   `wrangler secret delete` on both, in production.

### Documentation discrepancies

4. **Issue 015 names two files by the wrong path.** It says
   `issues/008-launch-readiness.md` and
   `docs/future_state_after_mvp/ios-bootstrap-brief.md`; both actually live in
   `docs/todos/`. Corrected in this pass, noted so 016 does not re-derive it.

5. **The M2M client id recorded in 010 is stale.** Its *Recorded values* table
   says `4amnaROizbljyXZOV5inS5qWB0khv6SN`. Both `server/wrangler.jsonc` and the
   `azp` claim of a token minted on 2026-08-20 say
   `aURi7aSf2Z1YHTZkUzgQURPHIbo8Xmb0`. The running system is right and the table
   is wrong, which is the more dangerous direction: the table is what a future
   reader trusts.

6. **010's step 10 cannot work as written**, independently of the URL being
   malformed: it creates a user with the M2M token, which is scoped to
   `read:users` and `delete:users` by design and answers 403. Account creation
   is a Dashboard action. Corrected in `014-account-deletion.md`'s HITL runbook;
   010 itself still needs the fix.

7. **Nothing else in `docs/architecture/` is stale.** `domain_model.md` and the
   rest were swept for `client_credentials`, `invite_code`, password hashing,
   `requireSession` and the session cookie: clean. Recorded so 016 confirms
   rather than repeats it.

## Acceptance criteria

- [x] `stack.md`'s access section points at `docs/architecture/auth.md` instead
      of describing a superseded design — the section is now a pointer plus the
      one line the rest of the document assumes, and the decisions-table row
      reads "Auth0 — hosted login, bearer tokens"
- [x] `api_contracts.md` no longer documents `/auth/*` as live routes, and its
      phase history records the supersession rather than erasing it — the
      authentication phase keeps its paragraph and gains a second one saying
      what replaced it and why the target changed, not that it was wrong
- [x] `008-launch-readiness.md`'s phone run describes signing in, and its
      invite-code criterion is struck with a note — struck rather than unticked,
      because it was genuinely done and then the thing it was done to was removed
- [x] The four superseded entries are gone from `todos.md`, with a closing note
      recording that the provider owns them rather than that they were built
- [x] `ios-bootstrap-brief.md` records that issue 014 closed Guideline
      5.1.1(v), and that the rest of store compliance is still open — 4.8, 4.2
      and 5.1.3 named explicitly as still open and not identity problems
- [x] `docs/mvp.md` no longer presents the invite code as the access gate — the
      section is kept and marked superseded, because the spend argument it
      carries is still what the security scope hangs off
- [x] No document still describes password hashing or the session cookie as
      current — `rember_user.md` was not on 015's list and needed its frontmatter
      updated; it had been superseded once already and is now superseded twice

## Blocked by

- Blocked by `issues/014-account-deletion.md`

## User stories addressed

- User story 42

## STATUS

DONE — seven documents reconciled. Findings that belong to issue 016 are recorded
above rather than fixed here: the live M2M client secret committed in issue 010
(rotate as 016's last step, immediately before the manual end-to-end run), two
dead Worker secrets, a stale client id, and a step-10 runbook that cannot work
as written.
