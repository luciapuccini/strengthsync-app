## Parent PRD

`issues/prd.md`

## What to build

The shared shadcn primitive changes needed for the mobile-first auth screens,
isolated so they land independently of any page that consumes them.

- Extend `Button` with a new `xl` size: tall, rounded, comfortable as a full-width
  mobile CTA and as a social button.
- Extend `Input` with taller, mobile-friendly sizing suitable for touch targets.

No `Separator` component is added (per the PRD). No page consumes these yet in this
slice — the change is verified via typecheck/lint and the existing test suite.

See the "Shared UI / shadcn changes" section of the parent PRD.

## Acceptance criteria

- [ ] `Button` accepts `size="xl"` and renders a tall, rounded, full-width-friendly button.
- [ ] Existing `Button` sizes/variants are unchanged.
- [ ] `Input` has a taller, mobile-friendly height without breaking existing usages (clients form, tracker, etc.).
- [ ] No `Separator` component is introduced.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

None - can start immediately.

## User stories addressed

Reference by number from the parent PRD:

- User story 12
