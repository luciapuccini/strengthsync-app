## Parent PRD

`issues/prd.md`

## What to build

The complete Sign up screen, mirroring Sign in and reusing the shared chrome and
primitives. All logic is placeholder.

- Brand mark + compact hero (from the shared components).
- Name, email, and password fields (taller mobile `Input`).
- A primary `xl` "Create account" button.
- Dummy Apple + Google buttons.
- A short legal line referencing Terms and Privacy.
- A link to `/sign-in`.
- The form calls `preventDefault` and does nothing, with a `// TODO: wire handler` note.
- English copy.

See the "Auth screens" and "Shared UI / shadcn changes" sections of the parent PRD.

## Acceptance criteria

- [ ] `/sign-up` shows brand mark, compact hero, name + email + password fields, an `xl` "Create account" button, Apple + Google buttons, a legal line, and a link to `/sign-in`.
- [ ] Submitting the form does nothing (no navigation, no request) and the handler carries a `// TODO`.
- [ ] Tapping the "Sign in" link navigates to `/sign-in`.
- [ ] Layout stays comfortable on a phone-width viewport (form accessible, not pushed below the fold).
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/002-shadcn-primitives.md`
- Blocked by `issues/003-public-shell-hero-brand.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 2
- User story 8
- User story 10
- User story 11
- User story 19
