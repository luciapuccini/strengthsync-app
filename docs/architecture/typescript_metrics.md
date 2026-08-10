# TypeScript scaling metrics

How to measure this workspace's TypeScript build health, and the current
baseline. See [`scripts/ts-metrics.mjs`](../../scripts/ts-metrics.mjs) for
the implementation; it wraps `tsc`'s own diagnostic flags rather than adding
a separate tool.

The repository already follows the recommended project-reference structure:
a shared [`tsconfig.base.json`](../../tsconfig.base.json), a references-only
root [`tsconfig.json`](../../tsconfig.json) ("solution" config), and one
`composite: true` package `tsconfig.json` per workspace (`apps/api`,
`apps/ui`,
`services/domain`, `services/agent`,
`services/db`). This doc measures that setup; it does not change compiler
options unless a measurement exposes a concrete problem.

## Commands

| Command | What it runs | Use it to |
| --- | --- | --- |
| `pnpm ts:diagnostics` | `tsc -b tsconfig.json --extendedDiagnostics` after clearing every package's `.tsbuildinfo` | Get a real (non-incremental) full-solution build: per-project and aggregate file counts, memory, and phase timings |
| `pnpm ts:list-files -- <workspace>` | `tsc -p <workspace>/tsconfig.json --listFilesOnly` | See every file pulled into one package's program |
| `pnpm ts:explain-files -- <workspace>` | `tsc -p <workspace>/tsconfig.json --explainFiles`, saved to `.diagnostics/<workspace>.explain-files.txt` | See *why* each file was pulled in (which import or reference caused it) |
| `pnpm ts:trace -- <workspace>` | `tsc -p <workspace>/tsconfig.json --generateTrace`, saved to `.diagnostics/<workspace>.trace/` | Get a Chrome-DevTools-compatible trace (`trace.json`); open at `chrome://tracing` or [ui.perfetto.dev](https://ui.perfetto.dev) and look at `checkSourceFile` / `checkExpression` events for hotspots |

`<workspace>` accepts either the full package name (`@strengthsync/api`) or
its short form (`api`, `ui`, `workflows`, `domain`, `agent`, `db`).

`.diagnostics/` is git-ignored (see [`.gitignore`](../../.gitignore)); traces
and explain-files output are local debugging artifacts, not committed.

## Baseline (2026-07-26)

Recorded with TypeScript 6.0.2, Node v24.12.0, pnpm 11.1.2, from
`pnpm ts:diagnostics` on a clean `.tsbuildinfo` state. This baseline
predates the Cloudflare Workflows migration (it still includes the former
`apps/workflows` package); re-run `pnpm ts:diagnostics` for current
numbers.

| Metric | Value |
| --- | --- |
| Projects in scope / built | 7 / 6 |
| Aggregate files | 2,825 |
| Aggregate lines of TypeScript (own source) | 8,316 |
| Aggregate lines of type definitions (mostly `node_modules`) | 655,817 |
| Aggregate types / instantiations | 153,894 / 440,627 |
| Aggregate memory used | ~610 MB |
| Aggregate check time | 0.88s |
| Aggregate parse time | 0.47s |
| Full solution build time | ~2.2s |

Reproduce with:

```
pnpm ts:diagnostics
```

### Interpretation

- Own source is small (8.3k lines across 6 packages); the overwhelming
  majority of "files" and "lines of definitions" come from `node_modules`
  (Cloudflare Workers types, OpenAI/AI SDK, React, etc.), which
  is normal and not a signal to act on by itself.
- Check time (0.88s) and parse time (0.47s) are both small relative to total
  build time; neither phase dominates. There is no current evidence of a
  program-size or type-complexity problem per the failure modes in
  `--extendedDiagnostics` guidance (high `Files` + `I/O Read time` points at
  file-set/resolution issues; high `Check time` points at type complexity).
- 6 composite packages is comfortably inside the empirically reasonable
  5–20 project range for multi-project TypeScript workspaces.
- Each package's `package.json` `exports` map points at specific entry
  files (`./contracts`, `./model`, `./coach`, `./schema`, `./testing`,
  etc.) rather than one catch-all barrel. Where an `index.ts` does re-export
  (`services/db`, `services/agent`, `apps/api`), it is a small, curated
  public-surface file with a handful of named exports, not a deep
  re-export-everything barrel — the aggregate file/line counts above show no
  evidence of the barrel-driven import blowup the scaling guidance warns
  about.
- `types: []` is already set on every package that doesn't need ambient
  globals (`services/domain`, `services/agent`), preventing ambient
  `@types` pollution. `apps/api` and `services/db` scope
  `types` to exactly what they need (`node`, `@cloudflare/workers-types`).

**Conclusion:** no compiler-option or project-structure changes are
warranted from this baseline. Re-run `pnpm ts:diagnostics` after
significant source growth (new packages, large new modules) and compare
against these numbers before considering restructuring.
