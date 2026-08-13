# PRD — Athlete Accounts (Registration + JWT Sessions)

## Problem Statement

The landing experience built in the previous phase is a facade. The sign-in and
sign-up screens look finished, but every form calls `preventDefault` and does
nothing, whether a visitor is "logged in" is a hardcoded constant, and the app
header links to a specific athlete's history by way of two UUIDs typed into the
markup. Nobody can create an account, nobody can sign in, and the app has no
concept of who is using it.

Underneath, the product has no notion of user identity at all. Access is
controlled by a single shared HTTP Basic credential representing one coach, and
that credential is only enforced when the server runs in production — locally
the API answers anyone. An athlete is a row owned by that one coach, with a
display name and nothing else: no email, no password, no way to prove they are
themselves. Every data route takes the athlete's id from the URL and trusts it,
so "which athlete am I looking at" is whatever the browser last typed.

The result is that a person who wants to use StrengthSync cannot start. There is
no front door that opens, and if it did open there would be nothing behind it to
tell one athlete from another.

## Solution

Let an athlete register for their own account, and make the session they get
back the thing that identifies them everywhere else.

An athlete signs up with their name, email and password. The server creates their
athlete record, stores their credentials separately with the password hashed, and
returns a signed session token in a secure cookie that lasts thirty days. From
that moment the browser is that athlete: every request carries the cookie, and
the server reads the athlete's identity from the token rather than from the URL.
Signing in later works the same way; signing out clears it.

Because identity now comes from the session, the API stops asking the browser
which athlete it means. Routes addressed at a specific athlete id are replaced by
routes addressed at "me". Reading another athlete's training log stops being a
matter of being refused — it stops being expressible. The shared coach credential
is retired entirely, and the same authentication runs locally and in production,
so what a developer exercises is what a user gets.

The screens from the previous phase stay as they are, and start working: the
forms submit, report what went wrong, show progress, and land the athlete in the
app. The dummy authentication flag, the hardcoded demo identifiers, and the
client-picker screen that only made sense for a coach are deleted.

This phase deliberately stops at the front door. A newly registered athlete has
no profile, no plan and no training week, and none can be generated yet — plan
generation only runs as part of completing an existing week. Rather than pretend
otherwise, the empty tracker says so honestly, and building a first-plan
onboarding becomes the next phase.

## User Stories

1. As a new athlete, I want to create an account with my name, email and password, so that I have my own space in the app rather than sharing one.
2. As a new athlete, I want to be signed in automatically the moment my account is created, so that I don't have to enter the same credentials twice in a row.
3. As a new athlete, I want to be told immediately if my email is already registered, so that I know to sign in instead of creating a duplicate.
4. As a new athlete, I want a minimum password length enforced, so that my training data isn't protected by a two-character password.
5. As a returning athlete, I want to sign in with my email and password, so that I can get back to my training log.
6. As a returning athlete, I want to be told when my password is wrong without being told whether the email exists, so that the form doesn't leak who has an account.
7. As a returning athlete, I want to stay signed in for about a month, so that I'm not re-authenticating every time I open the app.
8. As an athlete, I want to sign out from the app header, so that I can leave a shared device safely.
9. As an athlete, I want my password stored so that nobody who can read the database can recover it.
10. As an athlete, I want to see only my own profile, plan, weeks and history, so that my training log is private to me.
11. As an athlete, I want it to be impossible for another athlete to reach my data by guessing or editing a URL, so that privacy doesn't depend on a check somebody remembered to write.
12. As an athlete whose session has expired, I want to be returned to the sign-in screen, so that I'm not staring at an error card that a reload won't fix.
13. As an athlete, I want an error message to stay on screen while I correct the field it refers to, so that I'm not chasing a notification that disappeared.
14. As an athlete, I want the submit button to show that it is working and to refuse a second press, so that I don't create two accounts or two sessions by double-tapping.
15. As a newly registered athlete, I want the empty tracker to tell me I don't have a plan yet, rather than claim that plan generation is temporarily unavailable, so that I'm not waiting for an outage that isn't happening.
16. As an athlete, I want the social sign-in buttons to be visibly unavailable, so that I don't press something that looks live and get no response.
17. As an athlete, I want to reach my training history from the header, so that I don't need to know a plan identifier to find it.
18. As a signed-in athlete opening the root URL, I want to land on my tracker, so that I don't pass through a landing page I don't need.
19. As a signed-out visitor opening a private URL, I want to be redirected to sign in, so that I can't reach internal state without an account.
20. As an athlete on a phone, I want the sign-in and sign-up forms to keep the thumb-friendly sizing and layout they already have, so that nothing gets worse as they start working.
21. As a developer, I want password hashing to live behind one small module, so that the algorithm and its parameters are defined in exactly one place.
22. As a developer, I want session tokens to be issued and read through one small module, so that the token format, lifetime and payload can change without touching the routes.
23. As a developer, I want credentials stored in their own table rather than as columns on the athlete record, so that no existing query can accidentally return a password hash to the browser.
24. As a developer, I want the server to derive the athlete from the session instead of the URL, so that cross-athlete access is impossible by construction rather than blocked by a check.
25. As a developer, I want authentication enforced in every environment, so that local behavior matches production and the sign-in path is exercised on every request I make.
26. As a developer, I want the shared coach credential removed entirely, so that there is one authentication mechanism to reason about instead of two.
27. As a developer, I want one place that handles an unauthorized response, so that an expired session behaves identically no matter which screen was open.
28. As a developer, I want the dummy authentication flag and the hardcoded demo identifiers deleted, so that there is no second source of truth about who is signed in.
29. As a developer, I want one seed command that produces a demo athlete I can actually sign in as, so that the tracker and history screens remain reachable by hand.
30. As a developer, I want no command capable of pushing demo data or a repository-visible password into the production database, so that a convenience script can't create a real account in production.
31. As a developer, I want the generated API contract regenerated in every change that touches routes, so that the server and the browser cannot drift apart.
32. As a developer, I want the routes that no longer have any consumer removed rather than left live, so that the API surface reflects what the product uses.
33. As a developer, I want the new authentication modules covered by tests written the same way the existing suite is written, so that the coverage is consistent with the rest of the codebase.

## Implementation Decisions

### Identity model

- The athlete is the account. A person who registers becomes an athlete record and
  can sign in as themselves. There is no per-coach identity in this phase.
- Credentials live in a new table keyed by the athlete's id, holding a unique
  email and a password hash. The athlete record, its domain schema and every
  existing query are left untouched, so a password hash cannot leak through an
  endpoint that never selects it. This mirrors how the athlete profile is already
  split off from the core record.
- Self-registered athletes are attached to the existing seeded coach, reusing the
  athlete-creation repository function exactly as it is. The coach association
  becomes vestigial until real multi-coach identity is introduced.
- Email is trimmed and lowercased before uniqueness is checked or compared.
  Password has a server-enforced minimum length of eight characters, defined in
  the request schema only; the browser does not duplicate the rule.

### Session mechanism

- Sessions are JSON Web Tokens signed with HS256, using the JWT helpers already
  bundled with the HTTP framework. No new dependency is added.
- The payload carries the athlete's id as the subject, plus issued-at and
  expiry claims. Nothing else.
- The token is delivered in an HttpOnly cookie, `SameSite=Lax`, path-wide, marked
  `Secure` in production. The browser attaches it automatically. Script cannot
  read it.
- The single-page app and the API are same-origin in both development (through the
  dev server's proxy) and production (the Worker serves the app), so no
  cross-origin configuration and no change to the generated fetch client are
  required.
- Expiry is a fixed thirty days with no renewal and no refresh token. An athlete
  signs in again once a month. Individual sessions cannot be revoked; rotating the
  signing secret invalidates all of them.
- A new signing secret is introduced as a Worker secret and added to the local
  development variables and their example file. The shared Basic credential
  variables are removed from those files, from the environment type, from the
  Worker entry point and from the test kit.

### Authorization

- The JWT middleware replaces Basic authentication on the API and is mounted in
  every environment. The condition that previously enabled authentication only in
  production is removed.
- Authentication routes — sign-up, sign-in and sign-out — are mounted outside the
  guard, since they are what mint the token.
- Every data route addressed at a specific athlete is replaced by an equivalent
  route addressed at "me", taking the athlete's id from the verified token. There
  is no athlete identifier in any data path, so no cross-athlete request can be
  expressed and no ownership check is required. There is consequently no
  forbidden response to handle anywhere.
- The route that lists all athletes and the route that creates one are cut from
  the HTTP surface. The athlete-creation repository function survives as the
  internals of sign-up. This follows the precedent of the earlier contract audit,
  which cut consumerless routes while keeping the persistence behind them.
- A session bootstrap route returns the signed-in athlete, or unauthorized. It is
  what the browser calls on load to decide whether anyone is signed in.
- The workflow-start route remains unauthenticated and outside the API guard, as
  the current contract documentation already records and accepts. Securing it is a
  separate piece of work.

### Server modules

- A password module exposing hash and verify. It hides the key-derivation
  algorithm, its parameters, salt generation and the stored encoding behind two
  functions, and depends on neither the database nor HTTP.
- A session-token module exposing issue and read. It wraps the JWT helpers, the
  thirty-day lifetime and the payload shape, so that changing the token format
  later touches one file.
- A credentials repository exposing creation and lookup-by-email, following the
  existing repository conventions.
- A session middleware that reads the cookie, resolves the athlete id through the
  session-token module, places it on the request context, and returns
  unauthorized otherwise. It is deliberately thin glue.
- An authentication route area with its own endpoint and schema modules, matching
  the structure of every other route area. Handlers compose the password module,
  the credentials repository and the athlete-creation function directly, in the
  same way an existing handler composes an existence check with an upsert. No
  intermediate use-case layer is introduced.

### Client modules

- A session slice is added to the existing store, holding a status of loading, in
  or out, plus the signed-in athlete, with actions to bootstrap, mark signed in,
  and sign out. It occupies the slot vacated by the deleted selected-athlete
  slice. The store's own role as the single source of truth for shared app state
  is the reason it holds the session rather than a module-level promise cache.
- The API wrapper module gains sign-up, sign-in, sign-out and session-bootstrap
  calls, and a registration point for an unauthorized handler.
- Every existing API wrapper loses its athlete-id parameter, as do the tracker and
  history resource caches.
- The dummy authentication module, with its hardcoded authenticated flag and demo
  athlete identifier, is deleted outright rather than reimplemented.

### Routing and screens

- Browser routes mirror the API: the root resolves to the tracker when signed in
  and to sign-in otherwise; the tracker and history routes no longer carry an
  athlete identifier; the history route no longer carries a plan identifier
  either, because the history page resolves the athlete's active plan itself.
- The route guard gains a third state. While the session is bootstrapping it
  renders a spinner; signed out it redirects to sign-in; signed in it renders the
  private tree.
- The header's history link, currently two hardcoded UUIDs with a warning comment,
  becomes a static link. A sign-out control is added beside it, which calls the
  sign-out route, clears the session state and returns to sign-in.
- The athlete-picker screen and its form, list, credentials-notice components and
  selected-athlete store slice are deleted.
- Both forms submit for real: a pending state that disables the button, and a
  persistent error region fed by the typed API error. Field-level checking stays
  with the browser's native required and email validation, so no validation rule
  is duplicated across packages — which matters because the generated contract
  carries types but not constraints, and nothing would catch the duplicate
  drifting.
- An unauthorized response from any API call triggers a handler registered on the
  shared request helper, wired once at startup to the store's sign-out action.
  The indirection keeps the API layer free of a store import so its tests stay
  independent.
- The empty-tracker message is rewritten to address a newly registered athlete
  truthfully instead of reporting an outage.
- The social sign-in buttons render disabled with a short caption noting that
  social sign-in is not available yet.

### Contract regeneration

- Every change that touches routes must regenerate the API contract, which
  rewrites both the server's OpenAPI document and the browser's generated types.
  Both are committed artifacts and neither is ever hand-edited. Because the move
  to "me" routes renames nearly every path and the authentication routes are new,
  this happens in each issue that touches the route layer.
- The generator script itself must change: it constructs the application with the
  shared Basic credential, which no longer exists in the application
  configuration, and it registers a Basic security scheme into the emitted
  document. The credential argument is dropped and the security scheme is replaced
  with the session-cookie scheme, so the published contract describes the
  authentication the server actually has.

### Seeds, scripts and documentation

- A password-hashing script is added alongside the existing contract generator,
  using the same runner. It is run once to produce a credentials seed for the
  demo athlete, whose output is committed. Without it the seeded athlete — who
  owns the only plan, weeks and history in the repository — would have no way to
  sign in, and the tracker and history screens would be unreachable by hand.
- The seed commands are collapsed into one local command that applies the coach,
  demo, history and credentials seeds in order. The getting-started instructions
  drop from three commands to two.
- Every remote seed command is deleted. Seeding production becomes a deliberate
  manual step, documented in the readme, so that no command in the package
  manifest can push demo data — or a password committed to the repository — into
  the production database.
- The stack documentation's access decision, the contract documentation's
  authentication section and operation count, and the readme's authentication row,
  secrets table and getting-started section are all updated.

## Testing Decisions

A good test here asserts externally observable behavior: given a request, what
comes back; given an action, what state results. It does not assert how a hash is
encoded, which claims a token carries internally, or what class names a form
renders. The interfaces worth pinning are small and stable — hash and verify,
issue and read, a request and its response — and they are exactly where the
security-relevant behavior lives.

Tests are written as part of the issue that builds the code, not gathered into a
separate testing issue. Test-first is used where it is cheap and natural, and not
forced where it would be awkward.

**Driven test-first:**

- The password module: a hash verifies against its own input, fails against a
  wrong password, and fails against a tampered stored value. Two hashes of the
  same password differ, because each is salted.
- The session-token module: a token issues and reads back to the same athlete
  id; a token signed with a different secret is rejected; an expired token is
  rejected; a structurally malformed token is rejected.
- The credentials repository: creation and lookup-by-email round-trip, lookup of
  an unknown email returns nothing, and a duplicate email raises a conflict.
- The session store slice: bootstrapping resolves to signed-in or signed-out,
  marking signed in populates the athlete, and signing out clears it.

**Written alongside the code, at the HTTP level:**

- Sign-up creates the athlete and credentials and returns a session cookie; a
  duplicate email is a conflict; a short password is invalid input.
- Sign-in with correct credentials returns a session cookie; a wrong password and
  an unknown email are both unauthorized and indistinguishable from each other.
- The session bootstrap route returns the athlete with a valid cookie and
  unauthorized without one, with a tampered one, and with an expired one.
- Sign-out clears the cookie.
- A protected route rejects an absent cookie in every environment, which is the
  replacement for the four existing tests that pin authentication as
  production-only.

**Prior art.** HTTP-level tests through the constructed application are the
dominant pattern for every route area and are the model for the authentication
routes. Repository tests against the in-memory database fake are the model for
the credentials repository. Pure-function unit tests are the model for the
password and session-token modules. Store-slice tests are the model for the
session slice.

**Mandatory refactoring, not new coverage.** The test kit is built on the shared
Basic credential and on creating an athlete through a route this phase cuts; it
must be rebuilt around signing up and returning a session cookie. Every request
in the public API test file carries a Basic header and an athlete identifier in
its path, and all of it changes. Three browser-side API tests call wrappers whose
signatures lose a parameter. None of this is optional — it is what keeping the
suite green requires, and the suite is the pre-commit gate.

**Optional.** Router-level tests driving the guard and the root redirect through a
memory router. The dummy authentication module carries a note asking for exactly
these once real session state exists, so this is the moment they come due — but
they are not a blocker if they prove fiddly.

## Out of Scope

- Password recovery, password change, and email verification. The "forgot
  password" control on the sign-in screen remains a placeholder.
- Social sign-in with Apple or Google. The buttons are disabled, not implemented.
- Multi-factor authentication, account lockout, and rate limiting on the
  authentication routes.
- Session revocation and device management. The stateless token cannot be revoked
  individually; only rotating the signing secret invalidates sessions.
- Refresh tokens and sliding session windows.
- Coach accounts, coach identity, and any multi-tenant ownership model. The coach
  association stays a single seeded row.
- First-plan onboarding: collecting an athlete profile and generating an initial
  plan. A newly registered athlete ends this phase on an empty tracker, by
  decision. This is the next phase.
- Authenticating the workflow-start route.
- Building the athlete profile screen, which remains a documented gap with a live
  endpoint and no user interface.
- Fixing the missing contract-check script (see Further Notes).
- Internationalization. Copy stays English and inline.
- Any change to the tracker, week logging, history rendering, or workflow
  behavior beyond removing the athlete identifier from their inputs.

## Further Notes

- **Found while implementing this phase; not yet resolved.** Collected here so a
  final pass has one place to look. Each says who, if anyone, already owns it.
  - ~~**`getProfile` throws when a client has no profile**, so
    `GET /api/clients/{clientId}/profile` answers 500 where it declares 404.~~
    **RESOLVED in issue 013**, by deleting the route. The /me replacement added
    in 010 uses `findProfile`, which returns null. `getProfile` stays for the
    workflow, which cannot proceed without a profile and has no caller to
    answer with a 404; its doc comment now says so.
  - ~~**`getPlan` reads the *active* plan and throws when there is none**,
    despite its name and its `planId`-shaped caller, so
    `GET /api/clients/{clientId}/plans/{planId}` returns the active plan
    whatever id is asked for.~~ **RESOLVED in issue 013.** The route is deleted
    and the /me replacement uses `findPlanById`. That left the workflow as the
    only caller, which was the condition this entry set for the rename: it is
    now `getActivePlanOrThrow`, and a wrapper over `getActivePlan` rather than
    a duplicate of its query.
  - **The demo seed's in-flight week has expired.** `001_demo_seed.sql` pins it
    to 2026-07-20..26, and `getCurrentWeek` refuses a week whose window has
    passed, so signing in as the seeded athlete lands on the empty tracker. Not
    owned by any issue. Refreshing it is not a two-line edit: the day dates are
    baked into the week's `schedule` JSON. `src/app.auth.test.ts` asserts the
    present behaviour, so a refresh has a test that notices.
  - **`POST /wf/complete-week` declares a 401 it can never return.** The route
    is unauthenticated by design (already recorded below as a known MVP gap);
    issue 009 corrected its `security` declaration but left the response.
    *Belongs with issue 015.*
- **The contract-check script referenced by continuous integration does not
  exist.** The pipeline invokes it on every pull request, the contract
  documentation describes it as the guard that makes drift unmergeable, and the
  generator script accepts an output-path argument built specifically to serve
  it — but no such script is defined in the root package manifest, so the step
  fails on every run. This is recorded here as a known defect to be fixed
  separately. Two consequences apply during this phase: the verify job stays red
  at that step, so a genuine break is hard to distinguish from the standing one;
  and contract drift is unguarded precisely while nearly every path is being
  rewritten. The repository's own scratch notes guessed the script "may be
  unnecessary" — it is not, it is missing.
- **A read route for a plan by identifier may become consumerless.** With the
  history page resolving the athlete's active plan itself, the by-identifier plan
  read has no remaining caller. It is deliberately left in place here rather than
  cut, and flagged for the same kind of audit that previously removed three
  consumerless routes.
- **The remember-device design note is superseded.** It proposed extending Basic
  authentication with a signed thirty-day cookie carrying only an expiry. This
  phase adopts its cookie shape, its lifetime and its middleware location, but
  carries the athlete's identity in the payload and retires Basic authentication
  rather than layering on top of it.
- **`db:generate` is currently broken.** `server/db/drizzle.config.ts`'s
  `schema` path (`../src/db/schema.ts`) is resolved relative to the process's
  working directory, not the config file's location. The repository
  restructuring that produced the current `server/` layout moved the config
  without accounting for this, so running the documented `pnpm db:generate`
  from `server/` fails to find the schema. Discovered while generating this
  phase's first migration by invoking `drizzle-kit generate` directly from
  `server/db/` instead. Recorded here rather than fixed, the same way the
  `check:openapi` gap above is recorded — narrower scope than this phase.
- **Key-derivation cost interacts with the platform's CPU budget.** The free
  Workers plan allows ten milliseconds of CPU per request, and password hashing is
  deliberately expensive. The iteration count should be measured on the platform
  rather than copied from a general-purpose recommendation, and may need to be
  tuned down or may argue for a paid plan. This affects only the two
  authentication routes; no other request hashes anything.
- **The demo credential is committed on purpose.** The seeded athlete's password
  lives in the repository so that the tracker and history screens stay reachable
  in local development. It is safe only because no command can apply it remotely —
  which is why every remote seed script is deleted rather than merely left unused.
- **Issue folders are per phase.** The landing phase's PRD and its five completed
  issues now live in their own folder, and this phase's issues live beside this
  document with numbering restarting at one.
- **What survives from the landing phase.** The route tree, the two layouts, the
  guard and root-redirect components, both auth screens and the shared brand and
  hero components were built to survive the arrival of real authentication, and
  they do. What is deleted is exactly what was marked as a placeholder: the dummy
  flag, the demo identifier, and the no-op form handlers.
