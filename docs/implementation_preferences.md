# Implementation preferences

Repository-wide implementation rules. Add focused sections here as new preferences are agreed.

## Delivery and verification

- A task is done only after a successful commit.
- The commit is guarded by a pre-commit hook that runs TypeScript typecheck, lint, and unit tests.
- Do not report a task complete while any of those checks fail.
- If a failure appears unrelated, say so explicitly and name the failing check or test in the handoff summary.
- Do not bypass verification hooks.

## Node and dependencies

- Pin Node.js with `.nvmrc` in each project root.
- Use Node `22.14.0`.
- New contributors and machines should run `nvm use` from the project root before installing dependencies or running scripts.
- Prefer exact versions for development dependencies.
- Commit the lockfile so every machine resolves the same dependency tree and tool binaries.

## Naming

- UI component names use `camelCase`.
- All other code follows established TypeScript and platform conventions.

## Related project guidance

- React, TypeScript, testing, and more specific implementation guidance lives in `.cursor/rules` when introduced.
- Architecture and runtime decisions live in `docs/architecture/`.
