import { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";
import type { WorkflowEvent } from "cloudflare:workers";
import z from "zod";
import { COACHING_RULES } from "@strengthsync/domain/coach";
import {
  completeWeek,
  getPlan,
  getProfile,
  saveNextWeek,
  type Db,
} from "@strengthsync/db";

import type { Env } from "../env";
import { getAgentRuntime } from "../agent/agent-core";
import { createDb } from "@strengthsync/db";
import {
  ClientProfileSchema,
  PlanSchema,
  type ClientProfile,
  type Plan,
  type Week,
} from "@strengthsync/domain/model";

import {
  NextWeekScheduleSchema,
  WeekAnalysisSchema,
  type WeekAnalysis,
} from "@strengthsync/domain/coach";
import { addDays } from "@strengthsync/db";

type CompleteWeekParams = {
  clientId: string;
};

const LoadContextSchema = z.object({
  currentPlan: PlanSchema,
  rules: z.string(),
  userProfile: ClientProfileSchema,
});

const WEEK_ANALYSIS_SYSTEM = [
  "You are a strength coach analyzing one completed training week.",
  "Produce actionable guidance for generating the next week: adherence, skipped work,",
  "easy/hard/heavy/light feedback, performed sets versus prescription, and fatigue signals.",
  "Days with completed:false mean the athlete did not finish those sessions and missed targets;",
  "reflect reduced adherence in next-week guidance. Do not invent missing performance data.",
  "Do not prescribe the next schedule yet.",
].join(" ");

const NEXT_WEEK_SYSTEM = [
  "You are a strength coach generating the next dated training week.",
  "Return a full 7-day schedule with day_index 1–7 exactly once.",
  "Date day_index 1 as next_week_start_date and each following day sequentially.",
  "Every day must be incomplete: completed=false, completed_at=null.",
  "Every exercise must have skipped=false, feedback=null, and sets=[].",
  "Adjust prescribed series/reps/weight from the completed week and plan template using the analysis and coaching rules.",
  "Prefer progressive overload on compound lifts when the analysis supports it.",
].join(" ");

async function handleLoadContext(
  db: Db,
  clientId: string,
): Promise<{ currentPlan: Plan; rules: string; userProfile: ClientProfile }> {
  const [currentPlan, userProfile] = await Promise.all([
    getPlan(db, clientId),
    getProfile(db, clientId),
  ]);

  return LoadContextSchema.parse({
    currentPlan,
    rules: COACHING_RULES,
    userProfile,
  });
}
function buildCompleteWeekCtx(
  currentPlan: Plan,
  userProfile: ClientProfile,
  completedWeek: Week,
  rules: string,
) {
  return "Analyze the user's week and provide a summary for the coach to take action on."
    .concat("\n\n")
    .concat(
      JSON.stringify(
        {
          coaching_rules: rules,
          profile: userProfile,
          active_plan: currentPlan,
          completed_week: completedWeek,
        },
        null,
        2,
      ),
    );
}

function buildNextWeekPrompt({
  currentPlan,
  analysis,
  rules,
  completedWeek,
  userProfile,
  nextWeekStart,
}: {
  currentPlan: Plan;
  analysis: WeekAnalysis;
  rules: string;
  completedWeek: Week;
  userProfile: ClientProfile;
  nextWeekStart: string;
}) {
  return JSON.stringify(
    {
      active_plan: currentPlan,
      analysis,
      coaching_rules: rules,
      completed_week: completedWeek,
      profile: userProfile,
      next_week_start_date: nextWeekStart,
    },
    null,
    2,
  );
}

import {
  activateGeneratedPlan,
  generatePlan,
  loadCompletedWeeks,
  summarizeHistory,
  summarizeProfile,
} from "./plan-turnover.ts";

export class StrengthsyncWorkflow extends WorkflowEntrypoint<
  Env,
  CompleteWeekParams
> {
  override async run(
    event: WorkflowEvent<CompleteWeekParams>,
    step: WorkflowStep,
  ) {
    const db = createDb(this.env.DB);
    const { clientId } = event.payload;
    const completedWeek = await step.do("complete-week", async () =>
      completeWeek(db, clientId),
    );
    const { currentPlan, rules, userProfile } = await step.do(
      "load-context",
      async () => handleLoadContext(db, clientId),
    );

    if (completedWeek.week_index >= currentPlan.total_weeks) {
      // new plan branch
      const completedWeeks = await loadCompletedWeeks(step, db, clientId, currentPlan);
      const [profileSummary, historySummary] = await Promise.all([
        summarizeProfile(step, this.env, userProfile, rules),
        summarizeHistory(step, this.env, currentPlan, completedWeeks, rules),
      ]);
      const generatedPlan = await generatePlan(step, this.env, currentPlan, profileSummary, historySummary);
      const { plan, first_week } = await activateGeneratedPlan(step, db, clientId, event.instanceId, generatedPlan);
      return { plan_complete: true, plan_id: plan.id, first_week_id: first_week.id };
    }

    const weekAnalysis = await step.do(
      "analyze-week",
      { retries: { limit: 2, delay: "1 second", backoff: "linear" } },
      async () => {
        const weekAnalysis = await getAgentRuntime({
          apiKey: this.env.OPENAI_API_KEY,
          model: this.env.OPENAI_MODEL ?? "gpt-4.1-mini",
          system: WEEK_ANALYSIS_SYSTEM,
          prompt: buildCompleteWeekCtx(
            currentPlan,
            userProfile,
            completedWeek,
            rules,
          ),

          outSchema: WeekAnalysisSchema,
        });
        return weekAnalysis;
      },
    );

    const nextWeekSchedule = await step.do(
      "generate-next-week",
      { retries: { limit: 2, delay: "1 second", backoff: "linear" } },
      async () => {
        const nextWeekStart = addDays(completedWeek.end_date, 1);

        const nextWeek = await getAgentRuntime({
          apiKey: this.env.OPENAI_API_KEY,
          model: this.env.OPENAI_MODEL ?? "gpt-4.1-mini",
          system: NEXT_WEEK_SYSTEM,
          prompt: buildNextWeekPrompt({
            currentPlan,
            analysis: weekAnalysis,
            rules,
            completedWeek,
            userProfile,
            nextWeekStart,
          }),
          outSchema: NextWeekScheduleSchema,
        });

        return nextWeek;
      },
    );

    const savedWeek = await step.do("save-next-week", async () => {
      // WIP: a bit too much
      return saveNextWeek(
        db,
        clientId,
        currentPlan,
        completedWeek,
        nextWeekSchedule,
      );
    });
    return { plan_complete: false, next_week_id: savedWeek.id };
  }
}
