# 012 — Token verification and identity provisioning

## Parent PRD

`issues/auth0-migration/prd.md`

## What to build

The new identity system, against the seam issue 011 left behind. A bearer token
minted by the tenant reaches a guarded route and resolves to the right athlete,
creating that athlete's rows on first sight.

**`client_identities`.** A new table keyed by the internal athlete id, carrying
the provider's subject as a unique column and the athlete's email address. The
subject is a looked-up value, never a key: it is per-connection and opaque, so
the same person authenticating two ways is two subjects unless account linking
is enabled. Internal athlete ids do not change, so every foreign key in the
training data is untouched.

**A Management API client.** Exposes fetching a user and deleting a user. Hides
machine-to-machine token acquisition, caching that token until expiry, the base
URL and error mapping. Its outbound fetch is injectable, following the seam
`ingestFetch` already established in `AppConfig`.

**Identity resolution.** One function taking a subject and returning an internal
athlete id — the deep module of this change, and the only one with real
branching. Hides the lookup, the first-request profile fetch, the two-row insert
and the race between two simultaneous first requests. Provisioning is lazy and
unconditional: there is no eligibility check left to make, because every valid
token belongs to someone the operator created deliberately. D1 offers no
transaction across the two writes, so the unique constraint on the subject is
what makes the race safe — the same hazard the old sign-up path documented.

**The guard becomes real.** `requireAuth` verifies the bearer token against a
cached remote key set, asserting issuer and audience, then resolves the subject
to an athlete id and puts it on the context. The framework already ships JWK
verification, so no dependency is added — the same reasoning that originally put
password hashing on the platform's built-in crypto. Signature and context output
are unchanged from 011, so still no route handler is modified.

**Token verification is injected.** `AppConfig` gains an optional verifier that
only tests supply, so the suite stays fast and offline. The consequence,
accepted in the PRD: the key-set fetch, cache and the issuer and audience
assertions are the genuinely new code that tests never run, and a misconfigured
key set fails in a deployed environment rather than locally.

**`GET /api/me`** replaces the deleted `/auth/session`. It still has a job: the
client needs the internal athlete id to identify the user to product analytics
on a cold load.

**The testkit** mints a `TestClient` from a seeded athlete plus identity row and
the injected verifier, keeping the `id` / `headers` / `jsonHeaders` shape so the
restored tests read the way they did.

## Acceptance criteria

- [x] Migration creates `client_identities` with a unique constraint on the
      subject
- [x] Management API client hides M2M token acquisition and caching; its fetch
      is injectable
- [x] `resolveClientId` is tested for all three branches: subject already known,
      subject unknown so provision from a stubbed Management client, and two
      simultaneous first requests racing the unique constraint
- [x] `requireAuth` verifies against a cached key set and asserts issuer and
      audience; no route handler is modified
- [x] `AppConfig` carries an optional verifier supplied only by tests; the suite
      runs with no network access
- [x] `GET /api/me` returns the internal athlete id for a valid token
- [ ] A token minted by the real tenant reaches `GET /api/me` and provisions a
      first-time athlete — **the one step the suite cannot take.** Everything
      above runs against an injected verifier, so the issuer, audience and JWKS
      URL are unproven until a real token is presented against a deployed Worker.
      That is deliberate (see *Token verification is injected*), and it is why
      this is the last criterion rather than an incidental one.

### Restored test coverage

The inventory deleted in issue 011. Each group must be restored against bearer
tokens, or explicitly struck through here with a reason.

- [x] `GET /api/me/profile` — 404 before a profile exists; **returns the
      caller's own profile, never the other athlete's**
- [x] `PUT /api/me/profile` — creates against the session with no id in the
      request; 400 on an invalid body
- [x] `POST /api/me/onboarding` — creates against the session with no id in the
      request; 400 on an invalid body
- [x] `GET /api/me/plans/active` — 404 before activation; returns the caller's
      active plan
- [x] `GET /api/me/plans/{planId}` — returns the caller's plan by id;
      **404 for another athlete's plan id**
- [x] `POST /api/me/plans/generate` — refuses an athlete with no profile;
      refuses one who already has an active plan
- [x] `GET /api/me/weeks/current` — 404 before a plan exists; returns the
      caller's in-flight week
- [x] `GET /api/me/weeks` — **lists only the caller's weeks**; filters by
      `planId` and rejects an invalid status with 400
- [x] Day log writes — saves a day and marks it completed; patches a day;
      **refuses to write into another athlete's week**
- [x] The guard addresses these routes — 401 on every `/me` path without a
      token, and a malformed or expired token is indistinguishable from a
      missing one
- [x] Error envelope — 400 `invalid_id` for a malformed uuid in the path; 400
      `invalid_input` for an invalid body; a malformed JSON body stays inside
      the envelope; ~~404 `client_not_found` when a valid token names a deleted
      athlete~~ — **struck: the state is no longer constructible.** The foreign
      key from `client_identities.client_id` refuses to let an athlete be deleted
      while an identity points at them, so a token that resolves at all resolves
      to an athlete that exists. The branch stays in the four handlers, because
      `getClient` returns `Client | null` and the alternative is a non-null
      assertion; what is tested instead is the constraint that makes it dead, so
      that relaxing the foreign key later fails loudly rather than quietly
      widening what a token can reach.
- [x] Removed endpoints stay unrouted, with the `/auth/*` paths added to the
      list this pins
- [x] Training reads — 404 when the in-flight week has not started yet
- [x] Week route parameters — 400 `invalid_input` for an out-of-range or
      non-numeric `dayIndex`
- [x] Day log validation — 400 for a day patch whose skipped exercise carries
      sets
- [x] Workflow trigger — rejects `/api/wf/complete-week` without a token and
      starts no workflow; starts an instance for the authenticated athlete
- [x] ~~`/ingest` never forwards the caller's credentials upstream~~ — **already
      restored in 011.** The proxy strips `cookie` and `authorization` by name and
      never read either value, so the case was restated against a synthetic bearer
      token rather than deleted. Coverage was continuous.
- [x] ~~Sign-up, sign-in and sign-out are reachable without a cookie~~ —
      **struck, not restored.** All three routes are deleted for good, so there is
      nothing left to prove open. The successor concern is the inverse and is
      already listed above: the `/auth/*` paths must appear in the
      removed-endpoints pin.

### Interim compromises carried in from issue 011

Three things 011 left deliberately degraded rather than half-solved. Each is
undone here, and each will fail loudly if it is not.

- [x] **`client/src/api/types.ts` stops hand-declaring `Client`.** The schema left
      `openapi.json` entirely when the last route returning one was deleted, so the
      client carries a hand-written copy in the interim. `GET /api/me` puts it back
      in the contract; delete the local declaration and read it from
      `components['schemas']` again. Until that happens the project's rule — a
      payload shape is pinned by a Zod schema at the boundary, never hand-written
      on the client — is suspended in exactly one place.
- [x] **`client/src/api/weekResource.ts` sources the athlete from `GET /api/me`
      again.** It currently resolves `client: null`, which silently degrades two
      things: `reconcileWeekDraft` keys the local week draft by athlete id, and
      `trackerSlice.saveDay` refuses to write without one. Neither is reachable
      while every `/api/*` call answers 401, so this is safe exactly until the
      guard starts letting people through — which is this issue.
- [x] **The guard's test widens.** `app.public.test.ts` keeps one case asserting a
      blanket 401 inside the error envelope. It becomes the full assertion once
      tokens exist: missing, malformed, expired, wrong-audience and wrong-issuer
      all produce one indistinguishable rejection.

All three are undone. `TrackerData.client` is also no longer `Client | null`:
it was nullable only because of the compromise, and leaving the type saying
"maybe" after the maybe is gone would make every consumer handle a case that
cannot happen.

## Found while building this

**Account deletion must delete the Auth0 user first, then the local rows** —
never the other way round. `issues/014-account-deletion.md` inherits this as a
settled constraint, not an open question.

The reason is that `resolveClientId` provisions unconditionally on a subject it
has not seen. There is no eligibility check left to fail, because sign-ups are
disabled at the tenant and every subject that reaches the guard was created by
the operator.

So *local rows first* is the order that breaks. If the local delete succeeds and
the Auth0 delete then fails — a partial failure, and the PRD already rules a
retrying scheduled purge out of scope — the next request carrying that athlete's
still-live token does not error. The subject is unknown locally, the Management
API confirms the user exists, and the guard provisions them again: a brand new
athlete with an empty account. The deletion silently undoes itself, and nothing
anywhere reports a problem.

*Provider first* fails in the opposite direction, which is the survivable one.
Note what it does **not** do: it does not lock the athlete out immediately.
`resolveClientId` short-circuits on a known subject and never consults Auth0, so
an athlete whose provider user is gone keeps working until their access token
expires. What it does guarantee is that the window is bounded and terminal —
they cannot obtain a new token once the Auth0 user is gone, so at expiry they are
locked out for good. The residue is local rows nobody can reach, which is
recoverable, inspectable, and cleanable at leisure.

Bounded and cleanable beats unbounded and self-reversing. What is left for 014 to
decide is only what to do about those lingering rows, not which end to start
from.

## Blocked by

- Blocked by `issues/011-amputate-old-auth.md`

## User stories addressed

- User stories 9, 20, 26, 29, 30, 31, 32, 33, 36, 37, 38

## STATUS

IN PROGRESS — code complete; the deployed-token check is outstanding
