# Restore or remove the five broken root scripts

**STATUS: TODO**

## Parent PRD

None. Found while working through `issues/prd-zod-first-api-contract.md` and explicitly held out of
scope there; recorded so it stops being invisible.

## Problem

Root `package.json` declares five scripts that all fail, because `scripts/` is an empty directory:

| Script | Points at |
| --- | --- |
| `deps:check` | `scripts/check-dependency-policy.mjs` |
| `ts:diagnostics` | `scripts/ts-metrics.mjs diagnostics` |
| `ts:list-files` | `scripts/ts-metrics.mjs list-files` |
| `ts:explain-files` | `scripts/ts-metrics.mjs explain-files` |
| `ts:trace` | `scripts/ts-metrics.mjs trace` |

Confirmed by running each: all five exit non-zero. This predates the API-contract work — neither
file appears anywhere in the current tree.

Nothing depends on them. CI does not call them, lefthook does not call them, and no other script
does, which is why they have been broken without anyone noticing.

`deps:check` is the one worth thinking about before deleting. `pnpm-workspace.yaml` documents a
single-version policy ("any external dependency shared by two or more workspace packages must be
declared here and referenced as `catalog:`"), and `catalogMode: strict` already enforces the part a
package manager can enforce. Whether the deleted script checked something beyond that is the
question — if it did, that check is currently not running.

## What to build

Decide per script, then make `package.json` honest:

1. Recover the two files from git history if they exist there (`git log --diff-filter=D --name-only`)
   and judge whether they still earn their keep against the current layout.
2. Keep and fix, or delete the script entry. Do not leave a declared script that cannot run.
3. If `deps:check` covered anything `catalogMode: strict` does not, either restore it or write down
   what stopped being checked.

## Acceptance criteria

- [ ] Every script in root `package.json` runs successfully, or has been removed
- [ ] `scripts/` either contains the files it is expected to, or no longer exists
- [ ] If `deps:check` was dropped, the gap between it and `catalogMode: strict` is recorded
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` still pass from the root

## Blocked by

Nothing.
