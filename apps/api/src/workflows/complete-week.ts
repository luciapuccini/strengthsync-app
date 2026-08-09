import { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";
import type { WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../env";
import { getAgentRuntime } from "../agent/agent-core";
import { WeekAnalysisSchema } from "../../../../services/domain/src/coach/weekly-progression";

type Params = { clientId: string; weekId: string };

export class StrengthsyncWorkflow extends WorkflowEntrypoint<Env, Params> {
  override async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    // WIP:
    console.log({ event, step });

    getAgentRuntime({
      apiKey: this.env.OPENAI_API_KEY,
      model: this.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      system: [
        "You are a strength coach analyzing one completed training week.",
        "Produce actionable guidance for generating the next week: adherence, skipped work,",
        "easy/hard/heavy/light feedback, performed sets versus prescription, and fatigue signals.",
        "Days with completed:false mean the athlete did not finish those sessions and missed targets;",
        "reflect reduced adherence in next-week guidance. Do not invent missing performance data.",
        "Do not prescribe the next schedule yet.",
      ].join(" "),
      prompt: "Analyze the user's week and provide a summary of the week.",

      schema: WeekAnalysisSchema,
    });
  }
}
