import { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";
import type { WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../env";

type Params = { clientId: string; weekId: string };
// type IPResponse = { result: { ipv4_cidrs: string[] } };

export class StrengthsyncWorkflow extends WorkflowEntrypoint<Env, Params> {
  override async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    await step.sleep(" intentional delay pause", "2 seconds");

    const completeWeekEvent = await step.waitForEvent("complete-week", {
      type: "complete-week",
      timeout: "10 minutes",
    });

    await step.do("complete-week", async () => {
      console.log("🚀 ~ complete-week ~ event:", event);
      return {
        clientId: event.payload.clientId,
        weekId: event.payload.weekId,
      };
    });

    return completeWeekEvent;
  }
}
