import { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";
import type { WorkflowEvent } from "cloudflare:workers";
import z from "zod";
import {
  COACHING_RULES,
  HistorySummarySchema,
  ProfileSummarySchema,
} from "@strengthsync/domain/coach";
import {
  completeWeekV2,
  getPlan,
  getProfile,
  listWeeksV2,
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

// I dont like these imports it should be a package [TBD]
import {
  NextWeekScheduleSchema,
  WeekAnalysisSchema,
  type WeekAnalysis,
} from "../../../../services/domain/src/coach/weekly-progression";
import { addDays } from "../../../../services/db/src/dates";

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

async function handleLoadContext(db: Db, clientId: string) {
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

async function loadCompletedWeeks(
  step: WorkflowStep,
  db: Db,
  clientId: string,
  plan: Plan,
) {
  return step.do("load-completed-weeks", async () =>
    listWeeksV2(db, clientId, plan.id),
  );
}

async function summarizeProfile(
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

async function summarizeHistory(
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
      completeWeekV2(db, clientId),
    );
    const { currentPlan, rules, userProfile } = await step.do(
      "load-context",
      async () => handleLoadContext(db, clientId),
    );
    if (completedWeek.week_index >= currentPlan.total_weeks) {
      const completedWeeks = await loadCompletedWeeks(step, db, clientId, currentPlan);
      await Promise.all([
        summarizeProfile(step, this.env, userProfile, rules),
        summarizeHistory(step, this.env, currentPlan, completedWeeks, rules),
      ]);
      return { next_week_id: null, plan_complete: true };
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
