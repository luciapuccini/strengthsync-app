## Status

DONE — commit 97404b3

## Parent PRD

`issues/auth/prd.md`

## What to build

The persistence layer for athlete credentials, and nothing else. After this slice
the database can store and retrieve a credential record; no route, no UI and no
other module consumes it yet.

- A new table keyed by the athlete's id, holding a unique email and a password
  hash, with a foreign key to the athlete record and a creation timestamp.
- A generated migration for it. The athlete table, its domain schema and every
  existing query are left completely untouched.
- A repository exposing creation and lookup-by-email, following the conventions of
  the existing repositories.
- Email normalization (trim + lowercase) lives in the repository, on both the
  write and the lookup path, so no caller can bypass it and store a
  case-variant duplicate.

See the "Identity model" section of the parent PRD.

## Acceptance criteria

- [x] The migration creates the credentials table with a unique constraint on email and a foreign key to the athlete record.
- [x] `db:migrate:local` applies the migration cleanly against a fresh database.
- [x] Creating a credential and looking it up by email round-trips.
- [x] Looking up an unknown email returns nothing rather than throwing.
- [x] Creating a second credential with an email already in use raises a conflict repository error.
- [x] Email is normalized on both write and lookup: an address stored with mixed case or surrounding whitespace is found by its normalized form, and differs-only-by-case addresses collide.
- [x] The athlete table's schema, domain type and generated contract are unchanged by this slice.
- [x] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

None - can start immediately.

## User stories addressed

Reference by number from the parent PRD:

- User story 23
- User story 33
