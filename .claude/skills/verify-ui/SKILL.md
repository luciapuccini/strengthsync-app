---
name: verify-ui
description: Drive the running app in the Orca browser to verify UI work. Use after changing anything under client/src that renders, or when asked to check a screen, screenshot a route, confirm a flow works, or verify a change in the real app rather than in tests.
---

# Verify UI

Drives the local dev app through Orca's built-in browser (`orca tab`, `snapshot`, `click`, …)
to check that a UI change actually renders and behaves. No install needed — the `orca` CLI
is already on PATH and wraps Vercel's agent-browser.

## Core rule: assert, don't judge

**A screenshot is evidence, not a verdict.** Models reliably miss small-but-semantic visual
defects — a wrong token, a 4px shift, a stale value all read as "looks fine".

Every check needs a deterministic assertion:

```sh
orca get --what text --element e6 --json     # exact text
orca is  --what visible --element e6 --json  # {"visible": true}
orca get --what url --json                   # navigation actually happened
orca exec --command "console" --json         # {"messages": []} == no errors
```

Take the screenshot too, and read it — but report it as "here is what it looks like",
not as the pass/fail. If a claim can't be backed by an assertion, say so explicitly
rather than inferring it from pixels.

## 1. Preconditions

Both servers must be up. The client proxies `/api`, `/auth`, `/wf`, `/health` to wrangler,
so **if wrangler is down every authed screen renders an error state** — and a screenshot of
that error state looks like a real page. Check first, always:

```sh
lsof -nP -iTCP:5173 -iTCP:8787 -sTCP:LISTEN
```

Expect `node` on 5173 (vite) and `workerd` on 8787 (wrangler). If either is missing, start it
in the background and wait for the port before continuing:

```sh
pnpm --filter @strengthsync/client dev    # 5173
pnpm --filter @strengthsync/server dev    # 8787
```

Never screenshot before both ports are listening. A blank or error page is a precondition
failure, not a finding — report it as such instead of filing a UI bug.

## 2. Open and read

```sh
orca tab create --url http://localhost:5173/<route>
orca wait --timeout 3000
orca snapshot
```

`snapshot` returns the accessibility tree with stable refs (`@e1`, `@e2`). Act on refs, never
on coordinates. Refs are **re-issued on every navigation** — re-snapshot after anything that
changes the page, or you will click the wrong element.

## 3. Act

```sh
orca click --element e5
orca fill  --element e9 --value "30"
orca select --element e8 --value male
orca keypress --key Enter
```

## 4. Capture

`orca screenshot` only emits base64 inside JSON. Use the bundled script to get a real file:

```sh
.claude/skills/verify-ui/capture.sh /path/to/scratchpad/<name>.png
```

Write images to the session scratchpad, not into the repo. Then read the PNG back so you
actually look at it.

## Do not trigger generation

`/onboarding` step 4 submit and "Build your plan" kick off **real plan generation** — LLM cost
and account state mutation. Drive up to the submit and stop, unless the user explicitly asks
to exercise generation end to end.

## Gotchas

- **Always pass `--json`.** Without it `orca is` prints `[object Object]`.
- **The app is dark-only by design — there is no light theme to verify.** `client/src/index.css`
  sets `--background: var(--brand-black)` on `:root` unconditionally; `dark` is just a Tailwind
  `@custom-variant` for opt-in utilities. So `set media --color-scheme light` changes nothing,
  and neither does removing the `dark` class. Don't report that as a bug, and don't put
  light mode on a verification checklist.
- **Session state persists** across tabs in the default profile, so you are usually already
  signed in. Don't assume a logged-out view; check the snapshot for a "Sign out" button.
- **Tabs disappear** — if the user closes the Orca browser, commands fail with
  `{"ok": false, "error": {"code": "browser_no_tab"}}`. Re-run `orca tab create` and continue.
  Check `ok` on every `--json` response rather than assuming success.
- `snapshot`'s header line prints `undefined — undefined` for title/url. Cosmetic — use
  `orca get --what url --json` for the real URL.
- Any agent-browser command not surfaced as a top-level verb is reachable via
  `orca exec --command "<cmd>"`.

## Report

State what was asserted and what was only observed. Example:

> `/onboarding` renders step 1 of 4. Asserted: URL is `/onboarding`, heading text is
> "Who are you?", console clean (0 messages). Screenshot attached — the progress bar and
> the five fields look correctly spaced, but that part is visual observation, not an assertion.
