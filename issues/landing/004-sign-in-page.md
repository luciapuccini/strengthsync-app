## Parent PRD

`issues/landing/prd.md`

## What to build

The complete Sign in screen, built on the shell/hero chrome and the extended
primitives. All logic is placeholder.

- Brand mark + compact hero (from the shared components).
- Email and password fields (taller mobile `Input`).
- A dummy "Forgot password?" affordance.
- A primary `xl` "Sign in" button.
- Dummy "Continue with Apple" and "Continue with Google" buttons (lucide icons for
  generic glyphs; inline SVGs for the Apple/Google brand marks).
- A link to `/sign-up`.
- The form calls `preventDefault` and does nothing, with a `// TODO: wire handler` note.
- English copy.

See the "Auth screens" and "Shared UI / shadcn changes" sections of the parent PRD.

## Acceptance criteria

- [ ] `/sign-in` shows brand mark, compact hero, email + password fields, "Forgot password?", an `xl` "Sign in" button, Apple + Google buttons, and a link to `/sign-up`.
- [ ] Submitting the form does nothing (no navigation, no request) and the handler carries a `// TODO`.
- [ ] Tapping the "Sign up" link navigates to `/sign-up`.
- [ ] Layout stays comfortable on a phone-width viewport (form accessible, not pushed below the fold).
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/landing/002-shadcn-primitives.md`
- Blocked by `issues/landing/003-public-shell-hero-brand.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 1
- User story 3
- User story 4
- User story 7
- User story 9
