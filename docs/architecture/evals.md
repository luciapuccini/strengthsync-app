# LLM evaluation (future plan)


Braintrust is the target evaluation provider. The goal is to learn from real
workflow calls and a tiny set of hand fixtures without paying for LLM evaluation in CI.
When tracing gets implemented the recorder contract will be defined fresh inside
`server/src/agent`. 

## Principles (target state)

- Every workflow LLM call is traced through a recorder defined in `server/src/agent`.
- Evaluations are opt-in commands run by a developer. They do **not** run in CI, on
  deployment, or automatically after a workflow.
- Evaluation runs can make new model calls and cost money. Keep the sample small (`--limit`).
- Product data stays in D1; trace inputs, outputs, and scores live in Braintrust.
- Schema / shape validity is a **runtime** concern (Zod + unit tests), not an eval scorer.

## What the recorder must capture (target state)

For each call, the recorder should record:

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
  error: string | null;
  latency_ms: number;
};
```


## Scorers (target state)

- **Light-progression scorer**: did the next-week schedule keep compound loads within a
  reasonable band vs. the completed week?
- **Quality scorer**: does the generated plan/week include the required days and exercises,
  and does it respect the coaching rules? (Shape checks stay in Zod/unit tests; this scorer
  looks at coaching-rule adherence.)

These will live in `server` once the recorder is reconnected.
