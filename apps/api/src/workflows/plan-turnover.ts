import type { WorkflowStep } from "cloudflare:workers";
import {
  COACHING_RULES,
  HistorySummarySchema,
  ProfileSummarySchema,
} from "@strengthsync/domain/coach";
import { GeneratedPlanInputSchema } from "@strengthsync/domain/contracts";
import { listWeeksV2, type Db } from "@strengthsync/db";

import type { Env } from "../env";
import { getAgentRuntime } from "../agent/agent-core";
import type { ClientProfile, Plan, Week } from "@strengthsync/domain/model";

export async function loadCompletedWeeks(
  step: WorkflowStep,
  db: Db,
  clientId: string,
  plan: Plan,
) {
  return step.do("load-completed-weeks", async () =>
    listWeeksV2(db, clientId, plan.id),
  );
}

export async function summarizeProfile(
  step: WorkflowStep,
  env: Env,
  userProfile: ClientProfile,
  rules: string,
) {
  return step.do(
    "summarize-profile",
    { retries: { limit: 2, delay: "1 second", backoff: "linear" } },
    async () =>
      getAgentRuntime({
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL ?? "gpt-4.1-mini",
        system: [
          "You are a strength coach summarizing a client profile for plan generation.",
          "Return only the facts that affect training design: goals, loads, body composition,",
          "nutrition/recovery constraints, and schedule preferences.",
          "Do not invent missing data.",
        ].join(" "),
        prompt: JSON.stringify(
          {
            coaching_rules: rules,
            profile: userProfile,
          },
          null,
          2,
        ),
        outSchema: ProfileSummarySchema,
      }),
  );
}

export async function summarizeHistory(
  step: WorkflowStep,
  env: Env,
  currentPlan: Plan,
  completedWeeks: Week[],
  rules: string,
) {
  return step.do(
    "summarize-history",
    { retries: { limit: 2, delay: "1 second", backoff: "linear" } },
    async () =>
      getAgentRuntime({
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL ?? "gpt-4.1-mini",
        system: [
          "You are a strength coach summarizing a completed training block.",
          "Cover adherence, progression, skipped sessions, and easy/hard/heavy/light feedback patterns.",
          "Do not invent missing data.",
        ].join(" "),
        prompt: JSON.stringify(
          {
            coaching_rules: rules,
            active_plan: {
              label: currentPlan.label,
              total_weeks: currentPlan.total_weeks,
              week_template: currentPlan.week_template,
              rationale: currentPlan.rationale,
            },
            completed_weeks: completedWeeks,
          },
          null,
          2,
        ),
        outSchema: HistorySummarySchema,
      }),
  );
}

export async function generatePlan(
  step: WorkflowStep,
  env: Env,
  currentPlan: Plan,
  profileSummary: { summary: string },
  historySummary: { summary: string },
) {
  return step.do(
    "generate-plan",
    { retries: { limit: 2, delay: "1 second", backoff: "linear" } },
    async () =>
      getAgentRuntime({
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL ?? "gpt-4.1-mini",
        system: [
          "You are a strength coach generating a multi-week training plan.",
          "Produce a canonical week_template for days 1–7 with exercise_key, series, reps, rest, and optional weight.",
          "Follow the coaching rules. Prefer progressive overload on compound lifts.",
          "week_template must include every day_index from 1 to 7 exactly once.",
        ].join(" "),
        prompt: JSON.stringify(
          {
            coaching_rules: COACHING_RULES,
            profile_summary: profileSummary.summary,
            history_summary: historySummary.summary,
            previous_plan: {
              label: currentPlan.label,
              total_weeks: currentPlan.total_weeks,
              week_template: currentPlan.week_template,
              rationale: currentPlan.rationale,
            },
            coach_notes: null,
          },
          null,
          2,
        ),
        outSchema: GeneratedPlanInputSchema,
      }),
  );
}
