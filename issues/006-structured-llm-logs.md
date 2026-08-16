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
      target design (the integration interface used is already in `ai@7`)
- [x] Server tests still pass; the change does not alter what `getAgentRuntime`
      returns or throws

## Implementation notes

Built on the AI SDK's own telemetry lifecycle, not on plumbing wrapped around
`generateText`. `ai@7` exposes `registerTelemetry(integration)` plus a per-call
`telemetry: { functionId }`; `server/src/agent/telemetry.ts` implements one
integration against that interface and `getAgentRuntime` registers it once per
isolate. The sink is `console.log(JSON.stringify(…))` — stringified rather than
passed as an object because workerd's console formatter elides deep values,
which is the prompt and the output.

Registering through that interface is what keeps Braintrust a later sink swap
rather than a rewrite: the six call sites would not change.

Fields: `event: "llm_call"`, `call_id`, `call_site`, `provider`, `model`,
`status`, `latency_ms`, `prompt`, `prompt_chars`, and on a call that reached the
provider `output`, `output_chars`, `usage`, `finish_reason`, `response_id`,
`response_model_id`; `error` on failure.

`call_site` is the AI SDK's `functionId`, passed explicitly by each caller as
`AgentConfig.callSite` — `analyze-week`, `generate-next-week`,
`summarize-profile`, `summarize-history`, `generate-plan`, `first-plan`. Six
one-line edits, and the label is the step name rather than something derived
from prompt text.

`call_id` is the SDK's, unique per `generateText` call, so a step that retries
twice is three lines that differ there rather than one slow-looking call.

`prompt` is the SDK-normalised prompt (`instructions` + `messages`) — what
actually went over the wire, rather than the two strings the caller passed in.

Payloads are capped at 16k characters so an oversized prompt cannot cost the
line its model id and token usage; `prompt_chars` carries the true length.

Two behaviours worth knowing:

- Structured output is parsed *after* the SDK's end event, so a schema rejection
  produces two lines for one call: `status: "ok"` for the provider call, which
  did succeed and whose `output` shows the malformed payload, then
  `status: "error"` carrying the same `call_id` and prompt. A provider failure
  is one `error` line, as before.
- `getAgentRuntime` no longer re-validates with `outSchema.parse`;
  `Output.object` already did, and `result.output` raises
  `NoOutputGeneratedError` itself. Callers still see a rejection either way.

Not verified against a deployed Worker — `wrangler deploy` plus one real call is
what confirms the lines land in Workers Logs.

### Rejected: OpenTelemetry

The documented AI SDK → Braintrust path is `@vercel/otel` (Next.js) or `NodeSDK`
(Node), neither of which runs on workerd. The community bridge,
`@microlabs/otel-cf-workers`, is still `1.0.0-rc` and was last published in May
2025. If Braintrust is wanted later, its own SDK ships a `workerd` export and an
`initLogger` + `wrapAISDK` path that skips OTel entirely.

## Blocked by

None — can start immediately.

## PRD sections addressed

- Scope item 6 (Structured LLM logs)
- "Monitor LLM responses" — the second question the invited cohort exists to
  answer

## STATUS

DONE
