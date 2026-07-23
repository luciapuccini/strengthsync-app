import { z } from "zod";

import {
  ClientProfileSchema,
  PlanSchema,
  WeekSchema,
  type ClientProfile,
  type Week,
} from "../model/index.ts";

/**
 * LLM input/output DTOs and prompt builders for plan generation.
 * Provider SDKs stay in services/agent; this package stays schema-only.
 */

export const ProfileSummarySchema = z.object({
  summary: z.string().min(1),
});
export type ProfileSummary = z.infer<typeof ProfileSummarySchema>;

export const HistorySummarySchema = z.object({
  summary: z.string().min(1),
});
export type HistorySummary = z.infer<typeof HistorySummarySchema>;

/** Explicit stand-in when the client has never completed a training block. */
export const NO_PRIOR_HISTORY_SUMMARY =
  "No prior training history. This is the client’s first generated plan.";

export const SummarizeProfilePromptInputSchema = z.object({
  profile: ClientProfileSchema,
  coaching_rules: z.string().min(1),
});
export type SummarizeProfilePromptInput = z.infer<
  typeof SummarizeProfilePromptInputSchema
>;

export const SummarizeHistoryPromptInputSchema = z.object({
  active_plan: PlanSchema,
  completed_weeks: z.array(WeekSchema),
  coaching_rules: z.string().min(1),
});
export type SummarizeHistoryPromptInput = z.infer<
  typeof SummarizeHistoryPromptInputSchema
>;

export const GeneratePlanPromptInputSchema = z.object({
  profile_summary: z.string().min(1),
  history_summary: z.string().min(1),
  previous_plan: PlanSchema.nullable(),
  coaching_rules: z.string().min(1),
  notes: z.string().optional(),
});
export type GeneratePlanPromptInput = z.infer<
  typeof GeneratePlanPromptInputSchema
>;

export function buildSummarizeProfilePrompt(
  input: SummarizeProfilePromptInput,
): {
  system: string;
  prompt: string;
} {
  return {
    system: [
      "You are a strength coach summarizing a client profile for plan generation.",
      "Return only the facts that affect training design: goals, loads, body composition,",
      "nutrition/recovery constraints, and schedule preferences.",
      "Do not invent missing data.",
    ].join(" "),
    prompt: JSON.stringify(
      {
        coaching_rules: input.coaching_rules,
        profile: compactProfile(input.profile),
      },
      null,
      2,
    ),
  };
}

export function buildSummarizeHistoryPrompt(
  input: SummarizeHistoryPromptInput,
): {
  system: string;
  prompt: string;
} {
  return {
    system: [
      "You are a strength coach summarizing a completed training block.",
      "Cover adherence, progression, skipped sessions, and easy/hard/heavy/light feedback patterns.",
      "Do not invent missing data.",
    ].join(" "),
    prompt: JSON.stringify(
      {
        coaching_rules: input.coaching_rules,
        active_plan: {
          label: input.active_plan.label,
          total_weeks: input.active_plan.total_weeks,
          week_template: input.active_plan.week_template,
          rationale: input.active_plan.rationale,
        },
        completed_weeks: input.completed_weeks.map(compactWeek),
      },
      null,
      2,
    ),
  };
}

export function buildGeneratePlanPrompt(input: GeneratePlanPromptInput): {
  system: string;
  prompt: string;
} {
  return {
    system: [
      "You are a strength coach generating a multi-week training plan.",
      "Produce a canonical week_template for days 1–7 with exercise_key, series, reps, rest, and optional weight.",
      "Follow the coaching rules. Prefer progressive overload on compound lifts.",
      "week_template must include every day_index from 1 to 7 exactly once.",
    ].join(" "),
    prompt: JSON.stringify(
      {
        coaching_rules: input.coaching_rules,
        profile_summary: input.profile_summary,
        history_summary: input.history_summary,
        previous_plan: input.previous_plan
          ? {
              label: input.previous_plan.label,
              total_weeks: input.previous_plan.total_weeks,
              week_template: input.previous_plan.week_template,
              rationale: input.previous_plan.rationale,
            }
          : null,
        coach_notes: input.notes ?? null,
      },
      null,
      2,
    ),
  };
}

function compactProfile(profile: ClientProfile) {
  return {
    snapshot_date: profile.snapshot_date,
    sex: profile.sex,
    age: profile.age,
    height_cm: profile.height_cm,
    goals: profile.goals,
    body_composition: profile.body_composition,
    strength_loads: profile.strength_loads,
    nutrition: profile.nutrition,
    swimming: profile.swimming,
    schedule_preferences: profile.schedule_preferences,
    notes: profile.notes,
  };
}

function compactWeek(week: Week) {
  return {
    week_index: week.week_index,
    start_date: week.start_date,
    end_date: week.end_date,
    status: week.status,
    schedule: week.schedule,
  };
}
