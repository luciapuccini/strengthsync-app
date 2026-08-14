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

- [x] Every model call emits exactly one structured line on success, including
      prompt, output, model id, latency in ms and token usage
- [x] A failed call emits a line carrying the error, and a retried step emits one
      line per attempt
- [x] The lines are queryable in Workers Logs by call site, so
      `analyze-week` can be read separately from `generate-plan`
- [x] No new table, no new dependency, no change to `docs/architecture/evals.md`'s
      target design
- [x] Server tests still pass; the change does not alter what `getAgentRuntime`
      returns or throws

## Implementation notes

One `console.log(JSON.stringify(…))` per call, emitted from a `finally` in
`getAgentRuntime`, so returning, a provider error, missing structured output and
a schema rejection all produce exactly one line. Stringified rather than passed
as an object because workerd's console formatter elides deep values — which is
the prompt and the output.

Fields: `event: "llm_call"`, `call_id`, `call_site`, `system_fingerprint`,
`model`, `status`, `latency_ms`, `system`, `prompt`, `prompt_chars`, and on any
call that reached the provider `output`, `usage`, `finish_reason`, `response_id`,
`response_model_id`; `error` on failure.

`call_site` is derived from the system prompt's first sentence rather than passed
in, so none of the six callers changed. The six resolve to distinct labels —
`strength-coach-analyzing-one-completed-training-week`,
`strength-coach-generating-a-multi-week-training-plan`, and so on. `AgentConfig`
takes an optional `callSite` that overrides the derived label, if the literal
step names are wanted later. `system_fingerprint` is FNV-1a over the whole
system prompt: an exact grouping key that moves when the prompt is edited.

`call_id` is fresh per attempt, so a step that retries twice is three lines that
differ there rather than one slow-looking call.

Free-text fields are capped at 16k characters so an oversized prompt cannot cost
the line its model id and token usage; `prompt_chars` carries the true length.

Not verified against a deployed Worker — `wrangler deploy` plus one real call is
what confirms the lines land in Workers Logs.

## Blocked by

None — can start immediately.

## PRD sections addressed

- Scope item 6 (Structured LLM logs)
- "Monitor LLM responses" — the second question the invited cohort exists to
  answer

## STATUS

TODO
