# PRD — Landing Experience (Sign-in / Sign-up)

## Problem Statement

New and returning users currently have no front door to StrengthSync. The app
opens directly onto internal, authenticated screens (the `/` route is a bare
"Home splash page" stub, and the header exposes a hardcoded deep link into a
specific client's history). There is no place for a person to sign in, create an
account, or understand what the product is before entering — and there is no
notion of "public" versus "private" areas of the app. A logged-out visitor can
land on internal state that makes no sense to them.

## Solution

Introduce a simple, mobile-first landing experience that establishes a clear
public/private boundary for the client app:

- **Public** area with **Sign in** and **Sign up** screens, each showing the
  brand mark and a compact onboarding hero, presented in a centered mobile shell.
- **Private** area (the existing app: clients, tracker, history) gated behind an
  auth check, so logged-out visitors are redirected to Sign in.
- A root redirect that sends authenticated users straight into the app (the
  tracker) and everyone else to Sign in.

This PRD covers **dummy UI and routing only**. Every form, button, and social
provider is a visual placeholder with a `// TODO` where real logic will attach
later. Whether a user "is logged in" is a single hardcoded flag for now — but the
public/private route structure and the two layouts are real and will survive the
introduction of real auth.

## User Stories

1. As a logged-out visitor, I want to land on a Sign in screen instead of internal
   app state, so that I always have a sensible entry point.
2. As a new user, I want a Sign up screen with name, email, and password fields, so
   that I can see how account creation will work.
3. As a returning user, I want a Sign in screen with email and password fields, so
   that I can see how logging back in will work.
4. As a user on the Sign in screen, I want a "Forgot password?" affordance, so that
   I know account recovery will be available.
5. As a user on either auth screen, I want the StrengthSync brand mark visible, so
   that I trust I'm in the right place.
6. As a user on either auth screen, I want a compact onboarding hero image, so that
   the product feels motivating without pushing the form below the fold.
7. As a user on the Sign in screen, I want dummy "Continue with Apple" and
   "Continue with Google" buttons, so that I can preview social login options.
8. As a user on the Sign up screen, I want dummy Apple and Google buttons, so that I
   can preview social sign-up options.
9. As a user on the Sign in screen, I want a link to the Sign up screen, so that I
   can switch to creating an account.
10. As a user on the Sign up screen, I want a link to the Sign in screen, so that I
    can switch to logging in.
11. As a user on the Sign up screen, I want to see a short legal line referencing
    Terms and Privacy, so that I understand the agreement I'm entering.
12. As a mobile user, I want large, thumb-friendly buttons and inputs, so that the
    forms are comfortable to use on a phone.
13. As a mobile user, I want the auth screens centered in a phone-width shell with a
    soft radial glow, so that the experience feels intentional on small screens.
14. As an authenticated user, I want to be taken straight into the app (the tracker)
    when I open the root URL, so that I don't have to pass through a landing page.
15. As a logged-out user, I want to be redirected to Sign in if I try to open a
    private route directly, so that I can't reach internal state without access.
16. As an authenticated user, I want the app header to keep its existing navigation
    (logo + History), so that the internal experience is unchanged.
17. As a developer, I want a single obvious place to flip the "is logged in" flag,
    so that I can test both the public and private route trees without real auth.
18. As a developer, I want public and private routes to live under two distinct
    layouts, so that the auth boundary is declarative and easy to reason about.
19. As a developer, I want every form submission to be a no-op with a `// TODO`
    marker, so that it is obvious where real handlers must be wired.

## Implementation Decisions

### Route map

- `/` — a root redirect: authenticated → the tracker for the demo client; otherwise
  → Sign in.
- **Public routes** (rendered inside a public layout): `/sign-in`, `/sign-up`.
- **Private routes** (rendered inside the existing app layout, behind an auth guard):
  `/clients`, `/clients/:clientId/track`, `/clients/:clientId/plans/:planId/history`.
- `*` — Not Found.

### Auth boundary (dummy)

- A single dummy auth module exposes a hardcoded `IS_AUTHENTICATED` flag (default
  `false`) and a `DEMO_CLIENT_ID` constant (reusing the demo id already hardcoded in
  the current header), each marked with a `// TODO` for real session logic.
- A `RequireAuth` guard reads the flag and redirects unauthenticated users to
  `/sign-in`. Only private routes are guarded; public routes remain always
  accessible.
- A `RootRedirect` element resolves `/` to either the tracker (authenticated) or
  Sign in (not).

### Layouts (two, auth-scoped)

- **Public layout** — a mobile shell: centered column, a top circular
  radial-yellow glow that fades at the edges, and an outlet for the auth screens.
- **App layout** — the current `Layout` (header with logo + History nav, `max-w-3xl`
  main), refactored/renamed to serve the private routes with no behavior change.

### Auth screens

- Both Sign in and Sign up share a brand mark and a compact onboarding hero (the
  provided athlete image, circular-masked with a radial halo and softly faded edges),
  kept small enough that the form stays above the fold.
- Sign in fields: email, password; plus a dummy "Forgot password?" control, a primary
  "Sign in" button, dummy Apple + Google buttons, and a link to Sign up.
- Sign up fields: name, email, password; plus a primary "Create account" button, dummy
  Apple + Google buttons, a legal line, and a link to Sign in.
- Copy is in English. All forms call `preventDefault` and do nothing, each with a
  `// TODO: wire handler` note.

### Shared UI / shadcn changes

- `Button` gains a new `xl` size (tall, rounded, full-width-friendly) for the primary
  mobile CTAs and social buttons.
- `Input` gains taller, mobile-friendly sizing suitable for touch targets.
- No `Separator` component is added; switching between the two auth screens is a plain
  text link, and the social buttons sit below the form with simple spacing.
- Icons: `lucide-react` for generic glyphs (e.g. mail, back arrow) and inline SVGs for
  the Apple and Google brand marks (lucide has no brand icons).

### Assets

- The provided athlete splash image is copied into the client's `public/` directory and
  referenced by the shared hero.

## Testing Decisions

Good tests here exercise **externally observable routing behavior**, not markup or
styling details. Because this work is intentionally dummy UI with no business logic,
the automated-test surface is deliberately small; the deepest testable unit is the
routing/guard boundary, which has a simple, stable interface (given a flag, produce a
redirect or render the child).

- **In scope for tests (if the developer opts in):** the auth boundary behavior —
  given `IS_AUTHENTICATED = false`, private routes redirect to `/sign-in` and `/`
  redirects to `/sign-in`; given `IS_AUTHENTICATED = true`, `/` redirects into the
  tracker and private routes render. This can be driven with a memory router.
- **Not worth testing:** exact copy, class names, icon SVGs, hero layout, and the
  no-op form submit handlers (implementation details / placeholders that will change
  when real logic lands).
- **Prior art:** the client already uses Vitest + Testing Library (see the store slice
  tests, e.g. `trackerSlice.test.ts`) and jsdom is configured, so a router-level test
  fits the existing setup.

Tests will only be written if the developer explicitly requests them; the default for
this dummy-UI milestone is no new tests.

## Out of Scope

- Real authentication, sessions, tokens, or any credential handling.
- Backend endpoints, API contracts, and any data fetching for auth.
- Business logic behind the forms and social buttons (all are no-op placeholders).
- Password recovery flow, email verification, MFA, and error/loading/locked states.
- Internationalization (copy is English-only, inline).
- Onboarding carousel / multi-slide swiping (single static hero only).
- Changes to the existing private app screens beyond routing them under the app layout
  and the auth guard.

## Further Notes

- The former Welcome/onboarding concept has been folded into the two auth screens; the
  compact hero lives on Sign in and Sign up rather than on a standalone `/` page. The
  existing `routes/home/home.tsx` stub is removed.
- A brand mark on both auth screens is the standard, canonical pattern; a hero image on
  auth screens is an established choice specifically for consumer wellness/fitness apps
  with a strong visual identity (e.g. Strava, Headspace), provided it stays compact so
  the form remains accessible — which is the approach adopted here.
- The hardcoded `IS_AUTHENTICATED` flag and `DEMO_CLIENT_ID` are the single seams where
  real auth and real client selection will later attach; everything else (route tree,
  layouts, guards, screens) is intended to survive that change.
