## Parent PRD

`issues/prd.md`

## What to build

The visual chrome for the public area: the mobile shell and the shared brand mark +
compact onboarding hero that both auth screens will render.

- Flesh out `PublicLayout` into the mobile shell: a centered `max-w-md` column
  with a top circular radial-yellow glow that fades softly at the edges.
- Copy the provided athlete splash image into the client's `public/` directory.
- Add a shared brand-mark component (StrengthSync logo/wordmark).
- Add a shared compact hero component: the athlete image circular-masked with a radial
  halo and softly faded edges, sized so it never pushes a form below the fold.
- Render the brand mark + hero on the existing `/sign-in` and `/sign-up` stub pages so
  the chrome is demoable.

See the "Layouts" and "Auth screens" sections of the parent PRD.

## Acceptance criteria

- [ ] `PublicLayout` centers content in a `max-w-md` mobile column with the top radial-yellow glow visible and edge-faded.
- [ ] The athlete image is in `public/` and rendered by the hero with a circular mask, radial halo, and faded edges.
- [ ] Brand mark and hero appear on both `/sign-in` and `/sign-up`.
- [ ] The hero stays compact (form area remains above the fold on a typical phone viewport).
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/001-auth-boundary-routing-spine.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 5
- User story 6
- User story 13
