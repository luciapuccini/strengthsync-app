# Next steps: Provider setup + Milestone 2 (client profile UI)

**Created:** 2026-07-21 (plan approved; execution deferred to a later session)
**Context:** Roadmap item 1 is fully delivered (through `a6ab179`; see `2026-07-21_d1-api-workflow-runtime.md`). This document is the pickup point: work it top-to-bottom. Phase 1 ends with its own checkpoint; Phase 2 is milestone 2 as atomic commits.

**Locked decisions (from planning):**
- GitHub remote: **not created by the agent** — user creates it manually when ready (`gh repo create strengthsync-app --private --source . --push`; `gh` is authenticated as luciapuccini). CI greens on first push.
- UI data layer: **plain typed fetch client** (POC style, no query library yet).
- SPA assets: **public**; `/api/*` protected by shared Basic auth (docs/architecture/stack.md).
- depscore: **unblocked** — Socket token works (verified 2026-07-21: zod@4.4.3 = 87 overall). Run it before adding any new dependency.

---

## Phase 1 — Sanity checks & provider setup

Ordered: validate code paths locally **before** spending on accounts. Ends with checkpoint `docs/in_progress/<date>_provider-setup.md`.

| # | Task (owner) | Exit criteria |
| --- | --- | --- |
| 1.1 | **depscore pass** (agent): score every pinned non-workspace dep across root + `apps/*` + `services/*` (~21 packages: typescript, vitest, eslint, @eslint/js, typescript-eslint, globals, lefthook, zod, drizzle-orm, drizzle-kit, better-sqlite3, @types/better-sqlite3, @types/node, hono, @hono/node-server, wrangler, @cloudflare/workers-types, tsx, dotenv-cli, @temporalio/{client,worker,workflow}). Command per package: `npx socket@1.1.143 package score npm <pkg>@<version>`. Review/replace anything <70 overall per the dependency-safety rule | Score table in the checkpoint; no unreviewed low scores |
| 1.2 | **Node 22.14.0** (user installs nvm/mise; agent verifies): machine runs Node 24 without nvm. `nvm install` reads `.nvmrc` → `nvm use` → re-run `pnpm install` + typecheck/lint/test | `node -v` = v22.14.0; checks green; engine warning gone |
| 1.3 | **Local end-to-end smoke** (agent, zero accounts): `pnpm --filter @strengthsync/api db:migrate:local && pnpm --filter @strengthsync/api db:seed:local`; `pnpm --filter @strengthsync/api dev` (:8787); `temporal server start-dev` (:7233, UI :8233 — CLI installed); `pnpm --filter @strengthsync/workflows dev:api` (:3001) + `dev:worker`. Set `WORKFLOW_API_URL=http://localhost:3001` + `WORKFLOW_SERVICE_SECRET` in `apps/api/.dev.vars` so the proxy works **without a tunnel**. Scripted curl: health → create client (Basic) → PUT profile → internal activate → PATCH day → `POST /api/clients/:id/workflows/weekly-progression` → 202 → `GET /api/workflows/:id` → stub result → execution visible in Temporal UI | Full path green locally; results in checkpoint |
| 1.4 | **Docker image** (user starts Docker Desktop — currently down; agent builds): `docker build -f apps/workflows/Dockerfile -t strengthsync-workflows .` | Image builds |
| 1.5 | **Temporal Cloud** (user: console → namespace + API key; agent): fill root `.dev.vars` + `.env.workflows`; run `dev:api`/`dev:worker` against Cloud; stub start visible in Cloud UI. (Post-trial ~$100/mo already accepted in stack.md) | Cloud execution succeeds |
| 1.6 | **Cloudflare** (user: `wrangler login`; agent): `wrangler d1 create strengthsync` → paste real `database_id` into `apps/api/wrangler.jsonc` (commit) → `wrangler d1 migrations apply strengthsync --remote` → seed remote (`--remote --file ../../services/db/seeds/000_default_coach.sql`) → `wrangler secret put` × 5 (`BASIC_AUTH_USERNAME`, `BASIC_AUTH_PASSWORD`, `INTERNAL_API_SERVICE_SECRET`, `WORKFLOW_API_URL`, `WORKFLOW_SERVICE_SECRET`) → `wrangler deploy` | Deployed `/health` 200; `/internal/*` 403 without secret |
| 1.7 | **Cloudflare Tunnel** (user: `brew install cloudflared` — currently missing — + `cloudflared tunnel login/create`; agent): remotely-managed tunnel + private DNS hostname → ingress to `http://workflow-api:3001`; `TUNNEL_TOKEN` → `.env.workflows`; tunnel hostname → `WORKFLOW_API_URL` secret. `docker compose -f docker-compose.workflows.yml up -d --build`, then the §Startup health checks in `docs/operations/local_worker.md`, then the deployed round trip: `POST /api/clients/:id/workflows/weekly-progression` → 202 → status succeeded | Deployed Worker → tunnel → local worker → Temporal Cloud round trip works |
| 1.8 | **Braintrust** (user console → project + API key; agent read-only verifies): key into root `.dev.vars` + `.env.workflows`. Needed from milestone 4; provision now | Key provisioned |
| 1.9 | **OpenAI** (user dashboard): confirm project key active; set spending limit + model allowlist (stack.md requirement) | Noted in checkpoint |
| 1.10 | **Deferred manual items**: GitHub remote (user, command above; then branch protection requiring `ci`); custom domain `app.strengthsync.ai` (user DNS decision; can wait for deploy hardening) | Listed, not done |
| 1.11 | **Provider checkpoint commit**: provider matrix (provisioned/not), secrets inventory (**names only, never values**), smoke results, depscore table, gotchas | Committed per repo rules |

---

## Phase 2 — Milestone 2: client profile UI (atomic commits)

Scope: roadmap item 2 — "Deliver client profile with settings and preferences around the plan." Sections per `docs/mvp_scope.md`: goals, body composition, reference loads, nutrition, swimming, schedule preferences (+ basics: sex, age, height, notes). UI talks only to `apps/api` public routes. camelCase component/file names (`implementation_preferences.md`). depscore before every new dependency. Every commit passes the lefthook guard.

1. **`feat(ui): Vite React scaffold`**
   - `apps/ui`: vite@8.1.4 + @vitejs/plugin-react@6.0.3, react@19.2.7 + react-dom, react-router-dom@7.18.1, tailwindcss@4.3.2 + @tailwindcss/vite@4.3.2 (POC-proven versions; exact devDeps per prefs).
   - shadcn init (mirror POC `components.json` style; initial components: button, input, card, label, textarea, sonner) → deps: class-variance-authority, clsx, tailwind-merge, lucide-react, tw-animate-css, sonner.
   - Tests: jsdom@29.1.1 + @testing-library/react@16.3.2 + @testing-library/jest-dom@6.9.1; per-project `apps/ui/vitest.config.ts` (jsdom environment — root projects glob picks it up).
   - ESLint: react-hooks@7.1.1 + react-refresh@0.5.3 flat configs scoped to `apps/ui`.
   - `apps/ui/tsconfig.json`: add `"jsx": "react-jsx"`.
   - `index.html`, `src/main.tsx`, `src/App.tsx` placeholder route + render smoke test.

2. **`feat(ui): typed API client + dev proxy`**
   - `src/api/client.ts`: typed wrappers over domain contracts — `getClients`, `createClient`, `getProfile`, `updateProfile`, `getActivePlan`, `getCurrentWeek` (later milestones extend). Responses parsed with the domain Zod schemas (contracts are validated on both sides) → add `zod@^4.4.3` to ui deps.
   - 401 handling: surface a "check credentials" state; the browser-native Basic dialog does the actual auth.
   - `vite.config.ts`: `server.proxy` `/api` → `http://localhost:8787` (wrangler dev). `/internal` is **never** proxied — the browser must not reach it.
   - Tests: error mapping with stubbed fetch (`vi.stubGlobal`).

3. **`feat(ui): app shell, client list/create, picker`**
   - Layout: header (app name) + nav; sonner Toaster.
   - `/clients`: list + create form (`display_name`) → POST → auto-select.
   - Client selection context + localStorage persistence (single-coach MVP). `/` redirects: no client → `/clients`; else `/clients/:id/profile`.
   - Component tests: list renders, create flow, picker persists.

4. **`feat(ui): profile sections view/edit`**
   - `/clients/:clientId/profile`: basics (sex, age, height_cm; snapshot_date read-only), goals, body_composition, strength_loads, nutrition, swimming, schedule_preferences, notes.
   - Open records (`Record<string, unknown>`): known keys rendered as inputs; **unknown keys preserved via spread-merge on save**; PUT submits the complete `UpdateClientProfile` (the contract replaces the whole doc).
   - Known-key set: read the POC `src/app/client_profile.json` at execution time; if any content is non-English, flag it per the language rule before porting.
   - Save → toast success/error; disabled while saving.
   - Tests: preservation/merge logic unit tests; sections render known keys.

5. **`feat(api): serve SPA assets from the Worker`**
   - `apps/api/wrangler.jsonc`: `"assets": { "directory": "../ui/dist", "not_found_handling": "single-page-application" }` + `"run_worker_first": ["/api/*", "/internal/*", "/health"]` — assets public (locked decision); Worker handles API first.
   - `apps/ui` `build` script (`vite build`); root convenience scripts `dev:ui`, `dev:api`.
   - Verify `wrangler deploy --dry-run` shows the assets binding. CI unchanged (typecheck/lint/test already cover ui).

6. **`docs: checkpoint milestone 2 (client profile UI)`**
   - What/verification/decisions/dep scores; next = milestone 3 (plan creation + current-week tracking UI).

**Explicitly out of scope for milestone 2:** plan/week tracking UI (roadmap item 3), workflow-start buttons (item 4), chat (deferred per scope), TanStack Query (plain fetch per locked decision), optimistic updates.

---

## How to resume

1. Open `/Users/luciapuccini/Dev/strengthsync-app`, read this file.
2. Execute Phase 1 in order (1.1 → 1.11), then Phase 2 commits 1 → 6.
3. Before any `git` mutation, confirm with the user (standing policy); every commit passes the lefthook guard (`implementation_preferences.md`).
