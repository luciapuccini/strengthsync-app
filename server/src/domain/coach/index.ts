/**
 * Coaching rules and the LLM output schemas consumed by the Cloudflare Workflow.
 */

export { COACHING_RULES } from './coaching-rules.ts';

export { buildFirstPlanPrompt, type FirstPlanPrompt } from './first-plan.ts';

export {
  ProfileSummarySchema,
  HistorySummarySchema,
  type ProfileSummary,
  type HistorySummary,
} from './plan-generation.ts';

export {
  progressionCeiling,
  PROGRESSION_MODES,
  type ProgressionCeiling,
  type ProgressionMode,
} from './progression.ts';

export {
  WeekAnalysisSchema,
  NextWeekScheduleSchema,
  type WeekAnalysis,
  type NextWeekSchedule,
} from './weekly-progression.ts';
