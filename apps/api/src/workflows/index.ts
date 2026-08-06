import { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";
import type { WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../env";

type Params = { name?: string };
// type IPResponse = { result: { ipv4_cidrs: string[] } };

export class StrengthsyncWorkflow extends WorkflowEntrypoint<Env, Params> {
  override async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const data = await step.do("Test Action Step", async () => {
      return {
        message: "Hello, StrengthSync!",
      };
    });

    await step.sleep("pause", "2 seconds");

    const result = await step.do(
      "Test Result Step",
      { retries: { limit: 3, delay: "2 seconds", backoff: "linear" } },
      async () => {
        return {
          name: event.payload.name ?? "World",
          message: data.message,
        };
      },
    );

    return result;
  }
}
