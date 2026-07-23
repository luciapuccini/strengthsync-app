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

export { COACHING_RULES } from './coaching-rules.ts'

export {
  NO_PRIOR_HISTORY_SUMMARY,
  ProfileSummarySchema,
  HistorySummarySchema,
  SummarizeProfilePromptInputSchema,
  SummarizeHistoryPromptInputSchema,
  GeneratePlanPromptInputSchema,
  buildSummarizeProfilePrompt,
  buildSummarizeHistoryPrompt,
  buildGeneratePlanPrompt,
  type ProfileSummary,
  type HistorySummary,
  type SummarizeProfilePromptInput,
  type SummarizeHistoryPromptInput,
  type GeneratePlanPromptInput,
} from './plan-generation.ts'

export {
  WeekAnalysisSchema,
  NextWeekScheduleSchema,
  AnalyzeWeekPromptInputSchema,
  GenerateNextWeekPromptInputSchema,
  buildAnalyzeWeekPrompt,
  buildGenerateNextWeekPrompt,
  type WeekAnalysis,
  type NextWeekSchedule,
  type AnalyzeWeekPromptInput,
  type GenerateNextWeekPromptInput,
} from './weekly-progression.ts'
