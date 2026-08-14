# 006 — Structured LLM call logs

## Parent PRD

`docs/mvp.md`

## What to build

One structured JSON log line per model call, emitted from inside
`getAgentRuntime` (`server/src/agent/agent-core.ts`), capturing the prompt as
actually sent, the output, the model id, latency, any error, and `result.usage`.

Token usage is returned by the AI SDK today and dropped on the floor. It is also
the cost data.

All six call sites go through that one function — `plan-turnover.ts` ×3
(`summarize-profile`, `summarize-history`, `generate-plan`),
`strengthsync-workflow.ts` ×2 (`analyze-week`, `generate-next-week`) and
`plans/endpoints.ts` ×1 — so this is one change, not six. Workers Logs is already
enabled with `invocation_logs` in `server/wrangler.jsonc`.

The failure path matters as much as the success path: `getAgentRuntime` throws
when the model returns no structured output, and steps retry twice with linear
backoff, so a retried call should be visible as more than one line.

This is deliberately **not** the design in `docs/architecture/evals.md`.
Braintrust stays post-MVP and no `llm_trace` table is added. For twenty users
whose plans are going to be read by hand, a log line is enough, and building a
tracing layer we intend to replace is not. `docs/mvp.md` §6 records the deviation
and why; whoever picks this up should not "fix" the inconsistency by reaching for
Braintrust.

Note what already survives without this, so the logs are not asked to do work
they need not: final outputs are product rows (`plans.week_template`,
`plans.rationale`, `weeks.schedule`), and intermediate step outputs are retained
per-instance by Cloudflare Workflows for replay. The gap this closes is the
input, the model, the latency and the cost.

## Acceptance criteria

- [ ] Every model call emits exactly one structured line on success, including
      prompt, output, model id, latency in ms and token usage
- [ ] A failed call emits a line carrying the error, and a retried step emits one
      line per attempt
- [ ] The lines are queryable in Workers Logs by call site, so
      `analyze-week` can be read separately from `generate-plan`
- [ ] No new table, no new dependency, no change to `docs/architecture/evals.md`'s
      target design
- [ ] Server tests still pass; the change does not alter what `getAgentRuntime`
      returns or throws

## Blocked by

None — can start immediately.

## PRD sections addressed

- Scope item 6 (Structured LLM logs)
- "Monitor LLM responses" — the second question the invited cohort exists to
  answer

## STATUS

TODO
