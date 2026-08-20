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

**Rotate the credentials, last.** Deliberately the final action of this issue,
because it invalidates a working local setup and should land immediately before
the manual end-to-end run with real athletes rather than days ahead of it.
`issues/015-reconcile-docs-and-launch-checklist.md` records the full list; the
one that matters is that the **live M2M client secret is committed** in issue
010 and is in git history, so scrubbing the file is not enough. Rotate, re-set
via `wrangler secret put` and in `server/.dev.vars`, scrub, then untick issue
010's criterion that claims the secret appears in no file. Two dead Worker
secrets — `SESSION_JWT_SECRET` and `INVITE_CODE` — go at the same time.

**Suggested next steps.** Given what the sweep found, what should happen before
the invite batch — and what the iOS work now needs, given that the PRD closed
the auth blocker and left HealthKit scope, the Apple Developer Program account,
privacy nutrition labels, Guideline 5.1.3 disclosures and age rating open.

## Audit — answers

Written 2026-08-20 against the code, the deployed Worker and the tenant, not
against the issue files. Where a claim in an issue turned out to be wrong, the
evidence is here.

### 1. Are we on track with what we planned for?

**Yes, with one decision dropped and one shipped larger than planned.**

Every *Implementation Decisions* item in the PRD is shipped except CORS.

- **Identity provider** — custom domain, API resource server with offline
  access, three applications, refresh rotation with reuse detection, sign-ups
  disabled, no Actions. All present; `server/wrangler.jsonc` carries the public
  values and issue 010 records the dashboard state.
- **Data model** — `client_credentials` became `client_identities` with
  `client_id` as primary key and `subject` unique; internal ids unchanged;
  `invite_code` gone. `coaches.auth_subject_id` is still present and still
  unused, exactly as planned (`db/schema.ts:26`).
- **Request path** — `createTokenVerifier` asserts `iss` and `aud`, pins RS256
  so a token cannot nominate a weaker algorithm, and caches the key set keyed on
  an unseen `kid`. Provisioning is lazy and unconditional; the unique constraint
  on `subject` is what makes the race safe.
- **Modules** — all four exist with the boundaries the PRD described.
  `resolveClientId` is still **one call** hiding the lookup, the provisioning
  fetch, the two-row insert and the race; nothing leaked into a route. The
  client-side change is still a single wrapper (`authorizedFetch`), not an
  extracted module.

**Dropped: CORS.** The PRD lists it under *Clients* — "the native shell's web
origin makes API calls cross-origin for the first time, so the API needs CORS."
There is none in the codebase (`grep -rn cors server/src` is empty). This is
**correct**: the iOS app is explicitly out of scope, nothing is cross-origin
yet, and adding permissive CORS ahead of a caller that does not exist would
widen the API for no one. Recorded so the iOS work does not rediscover it as a
bug — it will be the first cross-origin caller and it will need this.

**Shipped larger than planned: guard coverage.** The PRD's *Testing Decisions*
says route-level guard behaviour is "deleted and not replaced". It was replaced,
and better: `app.me.test.ts:67` pins twelve guarded paths rejecting with no
credentials, and six distinct bad credentials all producing one indistinguishable
401. A divergence in the safe direction, but the PRD's text is now wrong and a
reader would under-estimate the coverage.

### 2. What diverged from project standards?

Four things, three of them warranted.

1. **`callEmpty` in `client/src/api/client.ts`.** `throwOnError` treats
   `data === undefined` as failure, which is right for every JSON route and
   wrong for a 204. Rather than loosen the shared helper for one caller, a
   no-content sibling sits beside it with the error path — including the 401
   handler — kept identical. **Warranted.**
2. **`deleteClient` and `deleteUnboundClient` are the same statement in two
   places** (`repositories/clients.ts`, `repositories/identities.ts`). A reviewer
   will read this as duplication. It is not: one takes back a row the calling
   request created moments earlier and that nothing has ever referenced, the
   other removes an athlete who has lived and is only safe after four other
   deletes. Both say so. **Warranted, but it is the change most likely to be
   "simplified" wrongly later.**
3. **`routes/account/` is a new route area for one endpoint.** It exists because
   it is the only route needing the Management client, and folding it into
   `clientRoutes` would have put that dependency in the signature of five routes
   that do not want it. **Warranted.**
4. **`lib/account-deletion.ts` has no test**, against a project standard of TDD
   where natural. Accepted by the PRD, which reasons that "nothing will fail if a
   future change inverts it". **That reasoning is measurably false**: inverting
   the order to delete local rows before the provider was tried on 2026-08-20,
   and an abort-case assertion — provider refuses, therefore nothing local is
   deleted and the account still works — failed immediately (expected 1 `clients`
   row, got 0). The resurrection assertion did *not* catch it, so the PRD is
   right about half of its claim. Recorded as a fact for a future reader, not
   reopened: the operator's decision was to run the manual check instead, and
   `docs/todos/auth0-e2e-verification.md` §4 is that check.

No route diverges from the `createRoute` + `app.openapi` shape. No test pins a
payload shape — every response shape is a Zod schema at the boundary flowing into
`openapi.json` and `client/src/api/openapi.d.ts`.

### 3. Are out-of-scope findings documented and not actioned?

Yes. Both the PRD's two known ones are recorded and neither was fixed:

- The account-deletion partial-failure gap is in
  `docs/future_state_after_mvp/todos.md`.
- The transactional email provider is in `docs/todos/008-launch-readiness.md`
  rather than `todos.md`, which is the better home — it gates the invite batch
  rather than being post-MVP. Cross-referenced from `todos.md` so it is
  discoverable from both.

### 4. Was `/docs` updated consistently with the progress?

Yes — `issues/015` changed seven documents, one more than it listed. It also
named two files by the wrong path; both live in `docs/todos/`, not where the
issue said. Confirmed by sweep: no document in `docs/architecture/` still
describes password hashing, `client_credentials`, `requireSession` or the session
cookie as current. `rember_user.md` was not on 015's list and needed its
frontmatter corrected — it had been superseded once already and is now superseded
twice.

### 5. What did the sequencing cost?

**Nothing permanent.** Issue 012's inventory is complete: every group is ticked,
two are struck with reasons that hold, and one was never actually lost.

- Struck: the `404 client_not_found` branch, because the foreign key from
  `client_identities.client_id` makes the state unconstructible. What is tested
  instead is the constraint itself (`app.me.test.ts:147`), so relaxing the
  foreign key later fails loudly rather than quietly widening what a token
  reaches. **Better than what it replaced.**
- Struck: "sign-up, sign-in and sign-out are reachable without a cookie" — the
  routes are gone, so there is nothing to prove open. The inverse is pinned
  instead, at `app.me.test.ts:260`, and all six removed paths are listed.
- Never lost: `/ingest` credential stripping was restated against a bearer token
  in 011 rather than deleted. Coverage was continuous.

The suite is 212 tests, all passing. The amputate-first sequencing cost one
commit of a deliberately-stubbed guard and bought every later issue a single
system to work against.

### 6. Suggested next steps

Proposed, not decided.

1. **Deploy.** Production is running 010–013. The last deploy was
   `2026-08-20T11:36Z` and issue 014 landed at `11:47Z`, so `DELETE /api/account`
   does not exist in production and the App Store requirement is not yet met by
   the running system.
2. **Run `docs/todos/auth0-e2e-verification.md`** end to end, in both
   environments. It is the only coverage for the four things the suite
   deliberately does not test.
3. **Rotate, last** (§7 of that document), immediately before the invite batch.
4. **Then 008's remaining launch items**, which are no longer auth-blocked: the
   phone run, the sending-domain decision, and one delivered invite email.
5. **iOS is unblocked but not started.** The auth blocker is closed and 5.1.1(v)
   is met once §5 passes in production. Still open and none of it is identity:
   HealthKit scope, the Apple Developer Program account, privacy nutrition
   labels, Guideline 5.1.3 disclosures, age rating, and CORS.

## Acceptance criteria

- [x] Each of the six questions above is answered in writing
- [x] Every PRD implementation decision is marked shipped or dropped, drops
      justified — one drop (CORS), justified by iOS being out of scope
- [x] Divergences from project conventions are listed with file and function —
      four, three warranted
- [x] Out-of-scope findings live in `docs/future_state_after_mvp/todos.md`, not
      in this issue
- [x] Issue 012's restored-coverage inventory is confirmed complete — verified
      against the test files, not against the ticks
- [x] The doc updates from issue 015 have actually been made — swept, seven
      files, no stale auth vocabulary left in `docs/architecture/`
- [ ] The M2M client secret is rotated, re-set as a Worker secret and in
      `.dev.vars`, scrubbed from `010-auth0-tenant-setup.md`, and that issue's
      "appears in no file" criterion is unticked until it is true
- [ ] `SESSION_JWT_SECRET` and `INVITE_CODE` are deleted as Worker secrets
- [ ] Issue 010's stale M2M client id and its unrunnable step-10 `curl` are
      corrected — the M2M app cannot create users, so account creation is a
      Dashboard action
- [x] Next steps are proposed, not decided
- [ ] Rotation is the **last** thing done, so the manual end-to-end run happens
      against the credentials that will actually be live

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

AUDIT DONE, EXECUTION OPEN. The six questions are answered above. What remains is
operator work and is deliberately not automatable: deploy (production is behind by
issues 014 and 015), run `docs/todos/auth0-e2e-verification.md` in both
environments, then rotate the credentials as the final step before the first
invite batch.
