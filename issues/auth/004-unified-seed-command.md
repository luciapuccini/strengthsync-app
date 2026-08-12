## Parent PRD

`issues/auth/prd.md`

## What to build

One command that seeds a working local database, and no command that can seed a
remote one.

- A single local seed command that applies the coach, demo, history and
  credential seeds in order. The individually-named local commands remain
  available for granular use.
- Every remote seed command is deleted. Seeding production becomes a deliberate
  manual invocation, documented in the readme, so that no command in a package
  manifest can push demo data — or the password committed in the previous
  slice — into the production database.
- The readme's getting-started section drops from three seed commands to one, and
  gains the manual production step.

See the "Seeds, scripts and documentation" section of the parent PRD.

## Acceptance criteria

- [ ] One local seed command applies all four seeds in the correct order against a fresh migrated database.
- [ ] The granular local seed commands still exist and still work individually.
- [ ] No remote seed command remains in any package manifest.
- [ ] The readme's getting-started section shows migrate plus one seed command.
- [ ] The readme documents seeding the production coach row as a manual step, and says why the other seeds have no remote command.
- [ ] Running migrate followed by the one seed command from scratch produces a database in which the demo athlete can be looked up by email.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/auth/003-demo-credential-seed.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 29
- User story 30
