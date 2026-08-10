# LLM evaluation (MVP)

Braintrust is the MVP trace and evaluation provider. The goal is to learn from real workflow calls and a tiny set of hand fixtures without paying for LLM evaluation in CI.

## Current migration status

The Temporal-era recorder lived in `apps/workflows`. In the Cloudflare Workflows migration, workflow LLM calls run through `apps/api/src/agent/agent-core.ts` via `getAgentRuntime`, which today uses the plain AI SDK `generateText` with **no Braintrust recorder attached**. Re-wiring the recorder (per the `LlmCallRecorder` interface in `services/agent`) is pending work. Until then:

- Workflow LLM calls are not yet traced to Braintrust.
- The deterministic scorers and fixture-based eval commands below still apply once the recorder is reconnected.
- `apps/workflows/evals/` is being relocated; point the paths below at their new home when the move lands.

## Principles

- Every workflow LLM call is traced through `LlmCallRecorder` (target state; see migration status above).
- Evaluations are opt-in commands run by a developer. They do **not** run in CI, on deployment, or automatically after a workflow.
- Evaluation runs can make new model calls and cost money. Keep the sample small (`--limit`).
- Product data stays in D1; trace inputs, outputs, and scores live in Braintrust.
- Schema / shape validity is a **runtime** concern (Zod + unit tests), not an eval scorer.

## What the recorder must capture

`apps/api` provides a Braintrust-backed `LlmCallRecorder` (falls back to console when `BRAINTRUST_API_KEY` is unset — pending reconnect). For each call, it records:

```typescript
type WorkflowLlmTrace = {
  workflow_id: string;
  workflow_type: "weekly_progression" | "plan_generation";
  step:
    | "analyze_week"
    | "generate_next_week"
    | "summarize_history"
    | "summarize_profile"
    | "generate_plan";
  model: string;
  input: unknown;
  output: unknown | null;
  tool_calls: Array<{ name: string; input: unknown }>;
  error: string | null;
  latency_ms: number;
  created_at: string;
};
```

The trace records the exact validated input and output envelope needed to replay a call. It must not include secrets. Client health/training context is sensitive, so access to the Braintrust project must be restricted to the coach/developer.

## Deterministic scorer: light progression

Located at `apps/workflows/evals/scorers/light-progression.ts`. Zero model-token cost.

**Use case:** when the completed week has more than three exercises with `feedback === "light"`, the next week should push aggregate prescribed load.

**Rule:**

1. Count `light` feedbacks on the input week schedule.
2. If `lightCount <= 3`, return `null` (Braintrust skips — not applicable).
3. Otherwise compare sum of `prescribed.reps` and sum of `prescribed.weight_kg` (`null` → `0`) across all exercises in input vs output.
4. Score `1` if either aggregate is strictly higher; else `0`.

This is an experimental product signal, not a structural/schema check.

## LLM-as-judge: AutoEvals ClosedQA

Strategic judges only for the two highest-impact steps:

| Step | Focus |
|------|--------|
| `generate_plan` | Fits goals/loads/schedule; coherent progressive template; does not invent profile facts |
| `generate_next_week` | Responds to analysis; sensible load change vs prior week; stays within plan intent |

Implemented with `ClosedQA` from `autoevals` in `apps/workflows/evals/scorers/quality.ts`. Criteria live on each fixture as `expectedCharacteristics`.

## Eval entrypoint

Evals call the same non-streaming agent helpers as production (`generatePlan` / `generateNextWeek`) via `apps/workflows/evals/run-step.ts` (being relocated as part of the migration). They never start a workflow or hit the API.

Tiny fixtures (not a growing golden dataset):

- `apps/workflows/evals/fixtures/plan-generation.json`
- `apps/workflows/evals/fixtures/week-generation.json` (includes a `>3 light` case + `sample_output` for score-only)

## Commands

```text
pnpm eval:score  -- --step generate_next_week
pnpm eval:replay -- --step generate_plan --limit 3
pnpm eval:replay -- --step generate_next_week --limit 3
```

- `eval:score` runs LightProgression against fixture `sample_output` only (no LLM tokens).
- `eval:replay` runs `braintrust eval` for the step (LLM call + LightProgression where applicable + ClosedQA).
- Both require `BRAINTRUST_API_KEY` for Braintrust logging/experiments; replay additionally requires `OPENAI_API_KEY`.

These commands are developer tools. They are excluded from GitHub Actions and deployment scripts.

## MVP scope

| Included | Not included |
| --- | --- |
| Required Braintrust trace for every workflow LLM call | CI-triggered evals |
| Manual fixture replay for plan + next week | Large static golden dataset |
| LightProgression deterministic scorer | Schema/structure eval scorers |
| ClosedQA for `generate_plan` and `generate_next_week` | Judges for summarize_* / analyze_week |
| Braintrust experiment comparison | Automated production promotion/rollback |

Schema validation remains a runtime safety check, not an evaluation scorer: invalid structured output fails before it can write product state.

## Layout

```text
(being relocated from apps/workflows/ in the Cloudflare Workflows migration)
apps/workflows/
  src/observability/
    llm-call-recorder.ts      # createLlmRecorder / console fallback
    braintrust-recorder.ts
  evals/
    run-step.ts
    plan-generation.eval.ts
    week-generation.eval.ts
    scorers/light-progression.ts
    scorers/quality.ts
    fixtures/
    cli.ts
```
