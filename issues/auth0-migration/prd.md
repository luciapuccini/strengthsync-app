# Auth0 migration — production authentication for web and iOS

## Problem Statement

StrengthSync is a mobile-first product with no mobile app. The web app is
mobile-shaped but lives in a browser, which means no App Store presence and no
access to HealthKit — and health data feeding the AI progression is the reason
for wanting a native app at all.

The blocker is not the UI. It is authentication. The web app and the API are
served from one origin, so the session cookie is same-site and needs no CORS. A
native shell runs its web content from a local origin, which makes every API call
cross-site; the cookie is then refused and the app fails on every request while
building and launching perfectly. Nothing about this shows up until the app is on
a device.

Underneath that, the current system is a small hand-rolled one that does what an
MVP needed and nothing more. Passwords are hashed and stored in our own database.
There is no password reset, so an athlete who forgets one has to be helped by
hand. There is no email verification. The Apple and Google buttons on the login
screen are rendered disabled with a caption explaining they don't work. Sessions
cannot be revoked without invalidating everyone's. Each of these is a small
feature to build alone and a large one to build well, and every one is table
stakes for an app people trust with body-composition data.

There is also a deadline that is not obvious: the cohort does not exist yet.
Today there are zero production users, so replacing authentication migrates
nobody. Once the first invite batch goes out there are real password hashes,
and the same change needs a custom hash verifier and a backfill.

Finally, the App Store has a hard requirement the current API cannot satisfy at
all: an app with account creation must let a user delete their account from
inside the app. There is no such endpoint.

## Solution

Move identity to Auth0 for both the web app and the future iOS app.

Athletes sign in on a StrengthSync-branded page at the project's own domain,
using the standard flow every native app uses: the system browser handles the
credentials, and the app receives a short-lived token it sends with each request.
The API stops issuing identity and starts verifying it. Password storage,
password reset, email verification, social sign-in, session revocation and
token rotation all become the identity provider's job.

Because the invited cohort is a known list of people, public registration is
switched off entirely and accounts are created directly. This removes the invite
code as a concept rather than relocating it — there is no gate to bypass when
every account that exists was created deliberately. It also removes the
possibility of a stranger triggering plan generation, which was the real thing
the invite gate protected.

The athlete's internal record keeps its own identifier, with the provider's
subject stored beside it as a looked-up value. Nothing about the training data
model changes; the plans, weeks and profiles keep pointing at the same rows.

Account deletion becomes a real endpoint, removing the identity first and then
the training data, so that a failure part-way through leaves someone locked out
rather than silently handed a fresh empty account.

Once this lands, the API speaks bearer tokens, which is what a native shell
needs. The iOS app then becomes an additive piece of work rather than a blocked
one.

## User Stories

### Athlete

1. As an athlete, I want to sign in on a page that clearly belongs to
   StrengthSync, so that I trust it with my credentials.
2. As an athlete, I want to reset my own password when I forget it, so that I
   am not locked out waiting for a human to help me.
3. As an athlete, I want to sign in with Apple, so that I do not have to create
   and remember another password.
4. As an athlete, I want to sign in with Google, so that I can use the account
   I already use everywhere else.
5. As an athlete, I want the app to remember me between sessions, so that I am
   not re-entering a password before every workout.
6. As an athlete, I want to stay signed in when I close and reopen the app on
   my phone, so that logging a set mid-session is never interrupted.
7. As an athlete, I want to use the same account on my phone and in a browser,
   so that my training history is one history.
8. As an athlete, I want my password stored by a specialist rather than by a
   small team, so that a mistake in this project cannot expose it.
9. As an athlete, I want a stolen session to stop working, so that losing my
   phone does not mean losing control of my data.
10. As an athlete, I want to delete my account and my training data from inside
    the app, so that leaving is as easy as joining.
11. As an athlete, I want deletion to actually remove my data rather than hide
    it, so that "delete" means what it says.
12. As an athlete who was invited personally, I want to just sign in, so that I
    am not asked for a code I was never given.
13. As an athlete, I want to land in onboarding immediately after my first
    sign-in, so that there is no dead screen between joining and starting.
14. As an athlete, I want a clear error when my credentials are wrong, so that I
    know whether to retry or reset.
15. As an athlete, I want to sign out and actually be signed out, so that a
    shared device does not expose my training.
16. As an athlete, I want to be able to see my password as I type it, so that I
    do not fail sign-in on a phone keyboard.
17. As an athlete, I want the login page to work on a small screen, so that the
    first thing I see is not broken.

### Operator

18. As the operator, I want to invite a specific athlete by email address, so
    that the cohort is exactly who I chose.
19. As the operator, I want it to be impossible for anyone uninvited to create
    an account, so that the two-week experiment measures the people I invited.
20. As the operator, I want to know which invited athletes actually signed up,
    so that the MVP's core funnel metric is readable.
21. As the operator, I want to revoke one athlete's access without affecting
    anyone else, so that offboarding is not an outage.
22. As the operator, I want password resets to happen without me, so that
    support is not a job.
23. As the operator, I want to enable multi-factor authentication later without
    shipping a release, so that security can tighten as the product grows.
24. As the operator, I want to add a new social provider without a deploy, so
    that sign-in options are a configuration decision.
25. As the operator, I want certainty that a stranger cannot trigger plan
    generation, so that model spend has a floor as well as a cap.
26. As the operator, I want athletes' email addresses queryable alongside their
    training data, so that I can tie a signup back to an invitation.
27. As the operator, I want the identity provider to stay free at this scale, so
    that the MVP has no new recurring cost.
28. As the operator, I want the login page to carry StrengthSync branding, so
    that the invited cohort's first impression is the product, not a vendor.

### Developer

29. As a developer, I want one identity system serving web and iOS, so that I am
    not maintaining two auth paths that drift.
30. As a developer, I want the API to authenticate requests without a shared
    secret, so that rotating a key does not sign everyone out.
31. As a developer, I want the request guard to expose the same context it does
    today, so that no route handler changes as part of this migration.
32. As a developer, I want to add a new guarded route without thinking about
    authentication, so that the guard stays a solved problem.
33. As a developer, I want to run the test suite without a live identity
    provider, so that tests stay fast and offline.
34. As a developer, I want to delete the password hashing code, so that the
    project no longer owns a cryptographic decision it has to keep re-justifying.
35. As a developer, I want to stop maintaining login and signup screens, so that
    UI effort goes into the tracker instead.
36. As a developer, I want identity logic to live in the repository rather than
    a vendor dashboard, so that it is typechecked, reviewed and covered by the
    pre-commit gate.
37. As a developer, I want the athlete's internal identifier to stay ours, so
    that changing identity provider later does not rewrite every foreign key.
38. As a developer, I want provisioning to be impossible to skip, so that no
    endpoint can be reached by an authenticated athlete who has no record.
39. As a developer, I want the native app to use the system browser for login,
    so that the implementation follows the OAuth spec for native apps rather
    than fighting it.
40. As a developer, I want tokens on iOS stored in the platform keychain, so
    that athletes are not signed out at random when the OS clears web storage.
41. As a developer, I want the account deletion order to be a deliberate,
    documented decision, so that a future change does not silently invert its
    failure behaviour.
42. As a developer, I want this to land before the first invite batch, so that
    it migrates nobody and needs no backfill.

## Implementation Decisions

### Identity provider

- Auth0, on a custom domain belonging to the project, so athletes never see a
  vendor hostname. Available at the free tier with a card on file for
  verification.
- A registered API resource server with offline access enabled. This is what
  makes access tokens verifiable signed JWTs rather than opaque strings; without
  it the API cannot validate anything locally.
- Three applications: a single-page app for web, a native app for iOS, and a
  machine-to-machine app scoped to reading and deleting users. Separate
  user-facing clients so callback URLs, refresh policy and revocation are
  independent.
- Refresh token rotation with automatic reuse detection on both user-facing
  clients. This is the provider's precondition for permitting refresh tokens in
  a browser app, and it also removes any dependence on third-party cookies,
  which mobile browsers block.
- Public sign-ups disabled at the connection. The cohort is created through the
  management API.
- **No provider-side Actions.** Every design that needed one moved logic into a
  dashboard where it is not in version control, not typechecked and not covered
  by the pre-commit gate. The cost avoided is paid instead by one indexed
  database read per request and one management API call per athlete, both cheap
  and both in tested code.

### Data model

- The existing credentials table is repurposed as an identities table: keyed by
  the internal athlete id, carrying the provider's subject as a unique column
  plus the athlete's email address. The password hash column is dropped.
- The table is kept rather than folded into the athlete row, so the repository
  split survives and an athlete who later links several provider identities has
  somewhere to put them.
- Internal athlete identifiers are unchanged, so every foreign key in the
  training data is untouched.
- The subject is a looked-up column, never a primary key. It is per-connection
  and opaque, so the same person authenticating two ways is two subjects unless
  account linking is enabled — making it a poor thing to build a schema on.
- The invite code column is dropped.
- The coach table's unused subject column stays unused. Coaches do not
  authenticate; the MVP has one seeded coach that every athlete references.

### Request path

- The existing session guard is replaced by JWK verification against a cached
  remote key set, asserting issuer and audience. The HTTP framework already
  ships this, so no dependency is added — the same reasoning that originally put
  password hashing on the platform's built-in crypto.
- The guard's interface is unchanged: it places the internal athlete id on the
  request context exactly as today, so **no route handler is modified**.
- An access token scoped to a custom audience carries the subject but **not**
  email or name. The API therefore knows who is calling and nothing else, which
  is why profile data is read from the management API rather than the token.
- Provisioning is lazy and unconditional. On a first request the athlete's rows
  are created from a one-time management API lookup. There is no eligibility
  check left to make — every valid token belongs to someone deliberately created.
- The database offers no transaction across the two provisioning writes. The
  unique constraint on the subject is what makes two interleaved first requests
  safe. This is the same hazard the current sign-up path already documents.
- Key-set caching matters for latency and outbound request count, not for the
  platform's CPU limit, which excludes time spent waiting on I/O.

### Modules

Four server modules, chosen so the module with real branching can be tested
without constructing HTTP requests:

1. **Management API client** — exposes fetching a user and deleting a user.
   Hides machine-to-machine token acquisition, caching that token until expiry,
   base URL and error mapping. Its outbound fetch is injectable, following the
   seam the analytics proxy already established.
2. **Identity resolution** — one function taking a subject and returning an
   internal athlete id. Hides the lookup, the first-request profile fetch, the
   two-row insert and the race between simultaneous first requests. The deepest
   module in the change: everything about how a provider subject becomes an
   athlete sits behind a single call.
3. **Request guard** — a middleware with the same signature and the same
   context output as the one it replaces. Hides key-set fetching and caching,
   signature verification, issuer and audience assertions, and the call into
   identity resolution.
4. **Account deletion** — one function hiding the ordering decision, the
   foreign-key-ordered cascade and the partial-failure semantics. The ordering
   rationale is the module's entire value, so it does not belong inline in a
   route.

The client-side change is deliberately shallow: a single fetch wrapper attaching
the bearer token, not an extracted module.

### Login experience

- Hosted login, not an embedded form. The OAuth specification for native apps
  requires authorization in the system browser rather than an embedded web view,
  and the iOS app is a web view — so an embedded form would be precisely the
  anti-pattern the spec exists to prevent. The existing sign-in and sign-up
  screens are deleted rather than rewired.
- This makes the currently-disabled Apple and Google buttons real, and makes the
  currently-inert password recovery link real.
- Branding is the provider's dashboard theme only: logo, palette, typeface. A
  full custom page template would carry the existing splash treatment across but
  introduces a second styling surface that the project's CSS tooling does not
  reach and the pre-commit gate cannot check — not worth it for a page each
  athlete sees once. Athletes see a provider-hosted page regardless, since the
  set-password link for a pre-created account lands on one.

### Account deletion

- A new authenticated endpoint deletes the provider's user first, then cascades
  the athlete's training data in foreign-key order.
- The ordering is chosen for its failure mode. If the cascade fails part-way,
  the athlete is already locked out — the identity is gone, so no token can ever
  be minted again — and what remains is unreachable rows that can be swept
  manually. The reverse order fails worse: a failed identity deletion leaves
  someone who can still sign in, and unconditional provisioning would hand them
  a fresh empty account, so a failed deletion would look like the app silently
  erased their training history.
- Accepted trade-off: rows can outlive a deletion request. At this scale that is
  a manual cleanup, not a system. The version that is correct under partial
  failure needs a marker write plus a scheduled retrying purge job, which is not
  worth building for twenty athletes.
- Marking an account archived does not satisfy the store requirement, which is
  explicit that deletion must not be deactivation.

### Clients

- Web: authorization code with PKCE, refresh tokens enabled, access token held
  in memory rather than browser storage. The API client already accepts a base
  URL and a custom fetch, so the token is attached in one place. The existing
  three-state session model maps onto the SDK's loading and authenticated flags,
  so the route guard keeps its shape and only the source of its state changes.
- iOS: the same SDK plus the system-browser and app-URL plugins. The iframe
  silent-auth fallback must be explicitly disabled, because mobile web views
  block third-party cookies and renewals otherwise fail intermittently. The
  token cache must be backed by the platform keychain — the provider's own
  guidance is that local storage on this shell should be treated as transient
  because the OS may clear it without warning, and the shell's preferences API
  is not secure storage either. This requires supplying a cache implementation,
  not setting a flag.
- The native shell's web origin makes API calls cross-origin for the first time,
  so the API needs CORS. It has none today because it never needed any.
- There is no single sign-on between the web app and the iOS app: the browser
  component used for login does not share cookies with the system browser.
  Accepted — each is signed into once.
- The session bootstrap route is replaced by an equivalent authenticated route,
  which still has a job: the client needs the internal athlete id to identify
  the user to product analytics on a cold load.

## Testing Decisions

A good test here asserts externally observable behaviour — what a caller gets
back for a given input and state — not how the module reaches it. Tests that
would pin a payload's shape are replaced by a schema at the boundary, following
the project's existing convention, so the generated contract enforces the shape
instead.

**Tested: identity resolution.** It is the deepest module and the only one with
real branching — subject already known, subject unknown so provision, and two
simultaneous first requests racing on the unique constraint. It is testable
directly against the in-memory test database with a stubbed management client,
without constructing HTTP requests. Prior art: the existing repository tests
already exercise data-layer behaviour against a test database, and the
credentials repository test is the closest analogue to what this replaces.

**Token verification is injected.** The application config gains an optional
verifier that only tests supply, exactly as the analytics proxy's fetch is
injected today. This keeps the suite fast and offline and introduces no new
concept.

**The test kit must be rewritten, and this is not optional.** Every guarded-route
test in the suite obtains its authenticated athlete by posting to the sign-up
route and scraping the session cookie. That route ceases to exist, so until the
kit mints identity a different way, most test files will not compile. Replacing
it is the backbone of the migration rather than a follow-up.

**Deliberately not covered, recorded as accepted:**

- The account deletion module. Its ordering is a decision about failure
  behaviour, and nothing will fail if a future change inverts it. Accepted on
  the grounds that the reasoning is written down in the architecture document
  and the endpoint is exercised manually before store submission.
- Guard behaviour at the route level — that a missing, expired, wrong-audience
  or wrong-issuer token all produce one indistinguishable rejection. The test
  file that proves this for the current cookie is deleted and not replaced.
- The key-set fetch, cache, issuer and audience assertions. Because the verifier
  is injected, the genuinely new code is the part tests never run. A
  misconfigured key set therefore fails in a deployed environment rather than
  locally.
- The management API client's token acquisition and caching.

## Out of Scope

- **The iOS app itself.** This change makes it possible; it does not build it.
  The shell, its package in the monorepo, and store submission are separate work.
- **HealthKit.** Which metrics are read, and whether they feed the AI
  progression or are only displayed, is undecided and unrelated to identity.
- **Multi-factor authentication.** Available at the free tier and not enabled:
  friction on a twenty-athlete cohort, and it can be switched on later from the
  dashboard with no code change.
- **Roles, organizations and multi-coach tenancy.** The MVP has one coach who
  does not authenticate.
- **Coach authentication.** The coach remains a single seeded record.
- **Single sign-on between web and iOS.** Ruled out by the browser component
  used for native login; revisiting means a different plugin.
- **Custom login page templates.** Dashboard theming only.
- **A retrying, scheduled purge for account deletion.**
- **A transactional email provider.** The identity provider's built-in email is
  rate-limited and vendor-branded, which is acceptable at this volume. The
  project's chosen marketing email tool cannot serve this role — it is API-only
  with no SMTP relay — so a real provider is needed before volume grows.
- **Account linking** between a password identity and a social identity for the
  same person.
- **Migrating existing password hashes.** There are none, and this must land
  before there are.

## Further Notes

**Sequencing.** Three separable pieces in order: this migration, then finishing
launch readiness and inviting the cohort, then the iOS app. Each is shippable
alone, and the web launch never blocks on store review.

**This change contradicts shipped work, deliberately.** The invite-code gate
delivered earlier is deleted rather than adapted. The launch-readiness checklist
needs revisiting: its instruction to "sign up with a code" during the real-phone
run no longer describes the flow, and its completed criterion about setting the
batch code as a secret becomes moot.

**Documentation consequences.** The stack document's access section describes
what is true today and stops being true when this lands; the architecture
document written alongside this PRD supersedes it. Four entries leave the
post-MVP todo list: password reset, social sign-in, showing the password in the
field, and a gate against fake users.

**Cost.** Free at this scale — twenty-five thousand monthly active users on the
free tier, against a cohort of twenty. The first paid tier is a feature
threshold, not a volume one. Worth knowing where the cliff is before it matters.

**Why now and not later.** With zero production users this migrates nobody.
After the first invite batch the same change needs a custom hash verifier and a
backfill. This is the cheapest it will ever be.
