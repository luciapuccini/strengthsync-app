# StrengthSync

StrengthSync helps a self-coached athlete — or a coach with a small caseload — turn weekly training results into an adapted next week, and at the end of a block into a new plan. Have your tracking app automatized your training progression.

## Tech stack

| Layer     | Choice                                                                             |
| --------- | ---------------------------------------------------------------------------------- |
| Monorepo  | pnpm workspaces + Turborepo; TypeScript; Node 22.14                                |
| UI        | React 19 + Vite + React Router + Zustand + Tailwind (`apps/ui`)                    |
| API       | Hono on Cloudflare Workers; serves the SPA in production (`apps/api`)              |
| DB        | Cloudflare D1 + Drizzle ORM (`apps/api/db`)                                        |
| Workflows | Cloudflare Workflows, in-Worker with `apps/api` (`StrengthsyncWorkflow`)           |
| LLM       | OpenAI via Vercel AI SDK                                                           |
| Auth      | HTTP Basic Auth (shared coach credential)                                          |
| CI        | GitHub Actions; Lefthook pre-commit                                                |

See [docs/architecture/stack.md](docs/architecture/stack.md) for decisions and boundaries.

## Purpose and user flows

### Clients

Open **Clients**, create or pick an athlete, and open their tracker.
One shared coach login covers the whole caseload in MVP.

### Week tracker

On the tracker, browse the in-flight week by day.
See prescribed sets, reps, rest, and weight for each exercise.

### Set logging

Log performed reps and optional weight per set as you train.
The week becomes a concrete performance log.

### Skip and feedback

Mark an exercise skipped, or tag it easy / hard / heavy / light.
Progression uses these constrained signals instead of free-form notes.

### Complete week

When the week is done, tap **Complete week**.
A Cloudflare Workflow freezes the log, analyzes it against the plan and profile, then creates the next adjusted week — or, at the end of the block, generates and activates a new plan.

## How to run

### Preconditions

- Node `22.14` (see `.nvmrc`; engines `>=22.14 <23`)
- pnpm `11.1.2` (see `packageManager` in root `package.json`)
- Wrangler (via the workspace) for the API Worker

### Secrets

Copy the example file and fill in values:

| Copy from                                                | Copy to              | Used by                         |
| -------------------------------------------------------- | -------------------- | ------------------------------- |
| [apps/api/.dev.vars.example](apps/api/.dev.vars.example) | `apps/api/.dev.vars` | API Worker: `BASIC_AUTH_*`, `OPENAI_*` |

### Getting started

```bash
pnpm install

pnpm --filter @strengthsync/api db:migrate:local
pnpm --filter @strengthsync/api db:seed:local
pnpm --filter @strengthsync/api db:seed:demo:local
```


```bash
pn turbo dev
```

## Troubleshoot

| Symptom                                     | What to check                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Plan generation / complete week fails       | Missing `OPENAI_API_KEY`; D1 migrations not applied                                            |
| `GET /health` looks fine but workflows fail | Health only proves the Worker — check `wrangler logs` for workflow-step errors                 |
| Pre-commit slow or failing                  | Lefthook runs full typecheck / lint / test — fix those locally first                           |

---

### Working with this repo

**Local Cloudflare dashboard**
http:/localhost:8787/cdn-cgi/explorer
