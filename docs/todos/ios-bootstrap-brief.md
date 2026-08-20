# iOS bootstrapping — brief for a grilling session

Input for a `/grill-me` session. It carries forward the brainstorming of
2026-08-18, which reached a decision on the shell and then deliberately deferred
everything about the store and HealthKit.

It also replaces `docs/future_state_after_mvp/ios.md`, deleted in commit
`30238ca`. That file's three questions are answered at the end; the third is the
whole subject of the session this brief is for.

**How to run it.** Everything under *Settled* was decided and should not be
reopened unless something here turns out to be wrong. Everything under *Open* is
the decision tree to walk, one question at a time, with a recommended answer
each. Look the *facts* up rather than asking about them — several below are
flagged as needing re-verification precisely so they are checked and not
inherited on trust.

## Settled

**Why native at all: App Store presence.** Not performance, not offline
capability, not gestures. The product is mobile-first and its absence from the
store is the gap. This framing matters, because it is what makes a thin shell a
legitimate answer rather than a shortcut.

**What ships: a Capacitor shell with real HealthKit, not a hollow wrapper.**
Capacitor bundles `client/dist` into the binary and serves it from a local
origin. React Native was considered and rejected — it would rewrite roughly 60%
of `client/src` to obtain a store listing. HealthKit is included in the first
version on purpose, so the app has a native reason to exist.

**Where it lives: a third package in this monorepo,** beside `client` and
`server`. Not a separate repository, which was the original instinct.

**Authentication was the real blocker, and it is being removed.** The shell's
web content runs from a local origin, which makes every API call cross-site; the
`SameSite=Lax` session cookie is then refused and the app fails on every request
while building and launching perfectly. Nothing about this surfaces until the
app is on a device. `issues/auth0-migration/prd.md` exists because of this.

**Login goes through the system browser.** RFC 8252 forbids embedded web views
for authorization, and a Capacitor shell *is* a web view — so an embedded form
would be exactly the anti-pattern the spec exists to prevent.

**No single sign-on between web and iOS.** The browser component used for native
login does not share cookies with the system browser. Each is signed into once.
Accepted.

**Sequencing: the Auth0 migration, then the web launch, then iOS.** Each is
shippable alone, and the web launch never waits on store review.

## Facts established — re-verify before relying on any of them

- **`server.hostname` is a trap.** It looks like the fix for the cross-origin
  problem. It is not: Capacitor's scheme handler then intercepts `/api/*` from
  the local bundle.
- **The Worker has no CORS at all today**, because `wrangler.jsonc` serves the
  SPA and the API from one origin. The shell would be the first cross-origin
  caller in the system's history.
- **Capacitor's maintenance status.** A search result during the session claimed
  Capacitor was being abandoned by Ionic. It was traced to a competing plugin
  vendor. Ionic sunset its *commercial* products; Capacitor is MIT and
  OutSystems has increased headcount on it. Re-check, but do not accept the
  abandonment claim without a primary source.
- **Auth0 on Capacitor is second-class.** The token cache must be backed by the
  platform keychain — this requires supplying a cache implementation, not
  setting a flag — and the iframe silent-auth fallback must be explicitly
  disabled, because mobile web views block third-party cookies. Every auth
  vendor evaluated treats Capacitor this way while shipping first-class Expo
  and React Native SDKs.
- **App Review Guideline numbers were cited from memory** and should be checked
  against the current published guidelines: 5.1.1(v) in-app account deletion,
  4.8 Sign in with Apple, 4.2 minimum functionality, 5.1.3 HealthKit privacy.
- **5.1.1(v) is already handled.** `issues/014-account-deletion.md` builds the
  in-app deletion the guideline requires. It is the only store requirement the
  auth work closes.

## Open — the session's decision tree

1. **HealthKit scope.** Which metrics are read, and — the question that actually
   matters — do they feed the LLM progression or are they only displayed? This
   decides whether the app has a native reason to exist, which is what Guideline
   4.2 turns on. Resolve this first; several answers below depend on it.
2. **4.2 minimum functionality, and the worst case.** The question asked in the
   original session and never fully closed: if review judges the app to be a
   repackaged website, what actually happens — rejection with a resubmission
   path, or something that jeopardises the developer account? Answer this
   concretely, not reassuringly.
3. **Apple Developer Program.** Enrolment as an individual or an organisation,
   what each requires, cost, and how long it takes. This is a lead-time item and
   may need starting before anything else here.
4. **Privacy nutrition labels and the 5.1.3 disclosures.** What must be declared
   given the answer to (1), and where the health-data disclosure lives in the
   app.
5. **Age rating**, and whether fitness and body-composition content changes it.
6. **Package layout.** Where the Capacitor package sits in the monorepo, how it
   enters the turbo pipeline, and whether CI builds it.
7. **Build and release.** Signing, TestFlight against a real submission, and how
   the shell's version relates to the web app's.
8. **What `client/dist` the shell carries.** Does a build pin a snapshot, or
   does the shell track web deploys? This decides whether shipping a web fix
   requires a store review.

## The original three questions

From the deleted `ios.md`, with what the brainstorming settled.

1. *Is React Native enough for HealthKit, or do we need a Swift module?* Moot as
   posed, since React Native was rejected. Under Capacitor, HealthKit is reached
   through a plugin that is Swift on the native side and JavaScript on the web
   side. If no published plugin covers the metrics chosen in open question (1),
   writing a small Swift plugin is the supported path, not a workaround.
2. *How easy is it to copy the web app into a React Native app?* It is not a
   copy — it is a rewrite of roughly 60% of `client/src`. That answer is what
   decided the shell.
3. *Are we compliant, and what does a real launch need?* Open. This is the
   subject of the session.
