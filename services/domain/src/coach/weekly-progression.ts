import { z } from "zod";

import {
  ClientProfileSchema,
  ISODateSchema,
  PlanSchema,
  WeekDaySchema,
  WeekSchema,
  type ClientProfile,
  type Plan,
  type Week,
} from "../model/index.ts";

/**
 * LLM input/output DTOs and prompt builders for weekly progression.
 * Provider SDKs stay in services/agent; this package stays schema-only.
 */

export const WeekAnalysisSchema = z.object({
  analysis: z.string().min(1),
});
export type WeekAnalysis = z.infer<typeof WeekAnalysisSchema>;

/** Fresh next-week schedule: seven dated days with empty performance logs. */
export const NextWeekScheduleSchema = z.object({
  schedule: z.array(WeekDaySchema).superRefine((days, ctx) => {
    const indexes = days.map((d) => d.day_index).sort((a, b) => a - b);
    const expected = [1, 2, 3, 4, 5, 6, 7];
    if (indexes.length !== 7 || indexes.some((v, i) => v !== expected[i])) {
      ctx.addIssue({
        code: "custom",
        message: "schedule must include every day_index from 1 to 7 exactly once",
      });
    }
    for (const day of days) {
      if (day.completed || day.completed_at !== null) {
        ctx.addIssue({
          code: "custom",
          message: `day ${day.day_index} must be incomplete (completed=false, completed_at=null)`,
        });
      }
      for (const exercise of day.exercises) {
        if (exercise.sets.length > 0 || exercise.skipped || exercise.feedback !== null) {
          ctx.addIssue({
            code: "custom",
            message: `day ${day.day_index} exercise ${exercise.exercise_key} must have empty logs`,
          });
        }
      }
    }
  }),
});
export type NextWeekSchedule = z.infer<typeof NextWeekScheduleSchema>;

export const AnalyzeWeekPromptInputSchema = z.object({
  week: WeekSchema,
  active_plan: PlanSchema,
  profile: ClientProfileSchema,
  coaching_rules: z.string().min(1),
});
export type AnalyzeWeekPromptInput = z.infer<typeof AnalyzeWeekPromptInputSchema>;

export const GenerateNextWeekPromptInputSchema = z.object({
  week: WeekSchema,
  active_plan: PlanSchema,
  profile: ClientProfileSchema,
  analysis: z.string().min(1),
  coaching_rules: z.string().min(1),
  /** ISO date (YYYY-MM-DD) for day_index 1 of the next week. */
  next_week_start_date: ISODateSchema,
});
export type GenerateNextWeekPromptInput = z.infer<
  typeof GenerateNextWeekPromptInputSchema
>;

export function buildAnalyzeWeekPrompt(input: AnalyzeWeekPromptInput): {
  system: string;
  prompt: string;
} {
  return {
    system: [
      "You are a strength coach analyzing one completed training week.",
      "Produce actionable guidance for generating the next week: adherence, skipped work,",
      "easy/hard/heavy/light feedback, performed sets versus prescription, and fatigue signals.",
      "Days with completed:false mean the athlete did not finish those sessions and missed targets;",
      "reflect reduced adherence in next-week guidance. Do not invent missing performance data.",
      "Do not prescribe the next schedule yet.",
    ].join(" "),
    prompt: JSON.stringify(
      {
        coaching_rules: input.coaching_rules,
        profile: compactProfile(input.profile),
        active_plan: compactPlan(input.active_plan),
        completed_week: compactWeek(input.week),
      },
      null,
      2,
    ),
  };
}

export function buildGenerateNextWeekPrompt(input: GenerateNextWeekPromptInput): {
  system: string;
  prompt: string;
} {
  return {
    system: [
      "You are a strength coach generating the next dated training week.",
      "Return a full 7-day schedule with day_index 1–7 exactly once.",
      "Date day_index 1 as next_week_start_date and each following day sequentially.",
      "Every day must be incomplete: completed=false, completed_at=null.",
      "Every exercise must have skipped=false, feedback=null, and sets=[].",
      "Adjust prescribed series/reps/weight from the completed week and plan template using the analysis and coaching rules.",
      "Prefer progressive overload on compound lifts when the analysis supports it.",
    ].join(" "),
    prompt: JSON.stringify(
      {
        coaching_rules: input.coaching_rules,
        profile: compactProfile(input.profile),
        active_plan: compactPlan(input.active_plan),
        completed_week: compactWeek(input.week),
        analysis: input.analysis,
        next_week_start_date: input.next_week_start_date,
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

function compactPlan(plan: Plan) {
  return {
    label: plan.label,
    total_weeks: plan.total_weeks,
    week_template: plan.week_template,
    rationale: plan.rationale,
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
