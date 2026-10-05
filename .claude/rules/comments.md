# Comments: code explains itself

This rule applies to every file you write or edit: source, tests, scripts, styles, and config.

## Default: no inline comments

Do not add comments. Make the code say what it does instead:

- Name variables, functions, and types for what they mean.
- Extract a well-named function or constant instead of commenting a block.
- Use types, enums, and tests to state intent and constraints.
- Delete commented-out code. Git keeps history.

Never write comments that:

- Restate what the code does (`// increment counter`, `// fetch products`).
- Describe what you changed or why you changed it in this task (`// fixed bug`, `// added for scan v2`, `// updated to use X`). That belongs in the commit message or PR.
- Label sections (`// --- helpers ---`, `// imports`).
- Address the reviewer or the user.
- Explain obvious framework or language behavior.

When you edit a file, leave existing comments alone unless they become false because of your change. Then update or remove them.

## Config files: zero comments

Config files (`*.json`, `*.jsonc`, `*.yml`, `*.yaml`, `*.toml`, `.env*`, `*.config.*`, `tsconfig*`, `.eslintrc*`, `Dockerfile`, CI workflows, and similar) must not contain comments. Keys and values must be self-explanatory. If a setting needs an explanation, it goes in `/docs` (see below).

## Exception: tagged comments for state the code cannot express

Use an inline comment only when it records something the code cannot show, such as:

- Temporary code that stays until another piece of work is done.
- A workaround for a known bug in a dependency or external service.
- A known defect that is not fixed yet.

These comments must:

1. Start with one of these TODO Highlight prefixes, uppercase, followed by a colon:
   - `TODO:` work that is pending.
   - `FIXME:` known broken or incorrect behavior that must be fixed.
   - `HACK:` intentional workaround that must be removed once its cause is resolved.
2. Fit on one line.
3. Name what resolves it: an issue, PR, file, or condition.
4. Sit directly above the line or block they refer to.

Examples:

```ts
// TODO: remove fallback once docs/issues/scan-v2.md is merged
// FIXME: totals are off by one when the cart is empty, see #51
// HACK: delay until the camera API reports ready, remove after upgrading to v3
```

Untagged comments, or tagged comments without a resolution condition, are not allowed. Prefer a few well-placed tags over many. When the resolving condition is met, delete the comment together with the temporary code.

## Large explanations go in `/docs`

If something needs more than one line to explain (architecture decisions, non-obvious flows, config rationale, integration details), write or update a Markdown file in `/docs` instead of adding a comment. Place it in the fitting subfolder (`docs/design`, `docs/agents`, and so on). If the code needs a pointer, use a single tagged comment that links to the doc, or none at all if the doc is easy to find.

## Before you finish

Check your diff for comments. Remove any that do not meet the exception above.