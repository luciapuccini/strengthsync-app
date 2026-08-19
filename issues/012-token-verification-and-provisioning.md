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

- [ ] Migration creates `client_identities` with a unique constraint on the
      subject
- [ ] Management API client hides M2M token acquisition and caching; its fetch
      is injectable
- [ ] `resolveClientId` is tested for all three branches: subject already known,
      subject unknown so provision from a stubbed Management client, and two
      simultaneous first requests racing the unique constraint
- [ ] `requireAuth` verifies against a cached key set and asserts issuer and
      audience; no route handler is modified
- [ ] `AppConfig` carries an optional verifier supplied only by tests; the suite
      runs with no network access
- [ ] `GET /api/me` returns the internal athlete id for a valid token
- [ ] A token minted by the real tenant reaches `GET /api/me` and provisions a
      first-time athlete

### Restored test coverage

The inventory deleted in issue 011. Each group must be restored against bearer
tokens, or explicitly struck through here with a reason.

- [ ] `GET /api/me/profile` — 404 before a profile exists; **returns the
      caller's own profile, never the other athlete's**
- [ ] `PUT /api/me/profile` — creates against the session with no id in the
      request; 400 on an invalid body
- [ ] `POST /api/me/onboarding` — creates against the session with no id in the
      request; 400 on an invalid body
- [ ] `GET /api/me/plans/active` — 404 before activation; returns the caller's
      active plan
- [ ] `GET /api/me/plans/{planId}` — returns the caller's plan by id;
      **404 for another athlete's plan id**
- [ ] `POST /api/me/plans/generate` — refuses an athlete with no profile;
      refuses one who already has an active plan
- [ ] `GET /api/me/weeks/current` — 404 before a plan exists; returns the
      caller's in-flight week
- [ ] `GET /api/me/weeks` — **lists only the caller's weeks**; filters by
      `planId` and rejects an invalid status with 400
- [ ] Day log writes — saves a day and marks it completed; patches a day;
      **refuses to write into another athlete's week**
- [ ] The guard addresses these routes — 401 on every `/me` path without a
      token, and a malformed or expired token is indistinguishable from a
      missing one
- [ ] Error envelope — 400 `invalid_id` for a malformed uuid in the path; 400
      `invalid_input` for an invalid body; a malformed JSON body stays inside
      the envelope; 404 `client_not_found` when a valid token names a deleted
      athlete
- [ ] Removed endpoints stay unrouted, with the `/auth/*` paths added to the
      list this pins
- [ ] Training reads — 404 when the in-flight week has not started yet
- [ ] Week route parameters — 400 `invalid_input` for an out-of-range or
      non-numeric `dayIndex`
- [ ] Day log validation — 400 for a day patch whose skipped exercise carries
      sets
- [ ] Workflow trigger — rejects `/api/wf/complete-week` without a token and
      starts no workflow; starts an instance for the authenticated athlete
- [ ] `/ingest` never forwards the caller's credentials upstream — restated for
      the `Authorization` header, since the cookie it used to pin is gone

## Blocked by

- Blocked by `issues/011-amputate-old-auth.md`

## User stories addressed

- User stories 9, 20, 26, 29, 30, 31, 32, 33, 36, 37, 38

## STATUS

TODO
