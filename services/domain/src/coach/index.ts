/**
 * Coaching rules, prompt builders, and LLM input/output DTO mapping.
 * See docs/architecture/workflows.md and docs/architecture/evals.md.
 */

export type WorkflowLlmStep =
  | 'analyze_week'
  | 'generate_next_week'
  | 'summarize_history'
  | 'summarize_profile'
  | 'generate_plan'
