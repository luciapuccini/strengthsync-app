# LLM evaluation (MVP)

Braintrust is the MVP trace and evaluation provider. The goal is to learn from real workflow calls without maintaining a static golden dataset or paying for LLM evaluation in CI.

## Principles

- Every workflow LLM call is traced through `LlmCallRecorder`.
- Real traced calls, not `dataset.json`, are the source material for an evaluation.
- Evaluations are opt-in commands run by a developer. They do **not** run in CI, on deployment, or automatically after a workflow.
- Evaluation runs can make new model calls and cost money. Run only selected traces, inspect the output, and keep the sample small.
- Product data stays in D1; trace inputs, outputs, and scores live in Braintrust.

## What the recorder must capture

`apps/workflows` provides a Braintrust-backed `LlmCallRecorder` to `services/agent`. For each call, it records:

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

## First scorer: tool choice

Keep and adapt the existing [toolchoice scorer](../../evals/scorers/toolchoice.ts). It is deterministic and has no model-token cost.

For a trace with an expected tool policy, it scores whether the expected tool was called and, when order matters, whether the calls appeared in the expected order.

```typescript
type ToolPolicy = {
  required: string[];
  ordered?: string[];
};
```

The activity supplies the policy as trace metadata at call time. For example, the POC weekly analysis expects the progress, current-plan, and coaching-rules tools before producing recommendations.

**Important:** the new MVP workflow draft loads context through the internal API and passes it directly into most LLM calls. Those calls have no tools to score. Do not add artificial tools just to make this scorer run. Tool choice applies only to genuinely tool-using calls—currently the POC-style weekly analysis and, later, chat.

## Evaluation modes

### Score a recorded output

Run deterministic scorers against one or more existing Braintrust traces.

- Does not call an LLM.
- Starts with `ToolChoice`.
- Useful for quickly reviewing whether a deployed tool-using call followed its policy.

### Replay selected traces

Fetch selected traces, rerun the relevant activity/agent call with its recorded input, then compare the new experiment in Braintrust.

- Makes LLM calls and costs money.
- Used after changing prompts, models, tools, or schemas.
- Begin with one trace; expand only after manual review.

## Commands

The final command names are implemented with the monorepo, but the MVP contract is:

```text
pnpm eval:score -- --trace <braintrust-trace-id>
pnpm eval:replay -- --trace <braintrust-trace-id>
pnpm eval:replay -- --step generate_plan --limit 3
```

- `eval:score` evaluates recorded output only.
- `eval:replay` creates a fresh Braintrust experiment from selected recorded calls.
- A trace id, step filter, or explicit small limit is required. There is no command that silently evaluates all production traces.
- Both commands require `BRAINTRUST_API_KEY`; replay additionally requires the model provider key.

These commands are developer tools. They are excluded from GitHub Actions and deployment scripts.

## MVP scope

| Included | Not included |
| --- | --- |
| Required Braintrust trace for every workflow LLM call | CI-triggered evals |
| Manual trace selection and replay | Static JSON golden dataset |
| Deterministic tool-choice scoring where tools exist | LLM-as-a-judge scoring |
| Braintrust experiment comparison | Automated production promotion/rollback |

Schema validation remains a runtime safety check, not an evaluation scorer: invalid structured output fails before it can write product state.

## POC migration

The current `evals/chat.eval.ts` and `evals/dataset.json` are a useful reference for Braintrust wiring, but they do not define the MVP evaluation source:

- static `dataset.json` is removed from the new workflow eval path;
- workflow eval code moves to `apps/workflows/evals/`;
- the shared `LlmCallRecorder` is implemented in `apps/workflows/src/observability/`;
- chat evaluation is deferred with chat itself.
