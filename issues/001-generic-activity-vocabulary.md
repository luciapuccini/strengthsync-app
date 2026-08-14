# 001 — Generic activity vocabulary

## Parent PRD

`issues/prd.md`

## What to build

Remove the two places where the domain is shaped around one client's sport, so
that everything built on top of it afterwards speaks a general vocabulary.

The profile column named `swimming` becomes `activities` — still a free-form JSON
column like its siblings, with a documented convention of a list of items each
carrying a name, sessions per week, optional days and an optional note. The demo
seed's swimming data becomes one item in that list rather than a column of its
own.

The day-type enum gains `full_body` and replaces `swimming` with the generic
`activity`. Day types live inside JSON columns, so this needs no migration, but
the enum exists in **three** places — the server domain model, the browser's
runtime copy, and a third hard-coded copy inside the browser's local week-draft
schema — and all three must agree or drafts stored by the UI will fail to parse.

See "Domain model changes" in the parent PRD for the reasoning behind both
changes, in particular why `full_body` is a prerequisite rather than a nicety:
the plans this phase generates are most often three-day beginner plans, which the
current enum cannot describe honestly.

Nothing user-facing changes. Success looks like the product behaving exactly as
it does today, with a vocabulary that no longer assumes the client swims.

## Acceptance criteria

- [ ] The profile column is renamed to `activities`, with a migration generated
      through drizzle-kit interactively so that migration and snapshot stay in
      step (this is the human-in-the-loop part; the tool asks whether the column
      was renamed or dropped and re-added).
- [ ] The domain schema, its persistence schema and every test fixture referring
      to `swimming` as a profile field refer to `activities`.
- [ ] The documented shape of the column is written down where the column is
      defined, so the next writer does not invent a second convention.
- [ ] The day-type enum is `upper_body`, `leg_day`, `full_body`, `rest`,
      `activity`, `cardio` in all three copies.
- [ ] Both demo seeds are updated: swimming days become `activity` days, and the
      demo profile's swimming data moves into the `activities` convention without
      losing any of its content.
- [ ] The tracker and history screens render a label and styling for `activity`
      and `full_body`; no day type falls through to an unlabelled state.
- [ ] The generated contract is regenerated and committed, and the CI
      regeneration diff passes.
- [ ] The domain-model document describes `activities` and the new day types.
- [ ] A freshly migrated and re-seeded local database renders the demo client's
      week with the swim sessions shown as activity days.
- [ ] Typecheck, lint and the full test suite pass.

## Blocked by

None — can start immediately.

## User stories addressed

- User story 46
- User story 47

## STATUS

DONE
