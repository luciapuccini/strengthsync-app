import { completeWeekV2, getPlan, getProfile, type Db } from "@strengthsync/db";
import { Hono } from "hono";
import type { Env } from "../env.ts";
import { COACHING_RULES } from "@strengthsync/domain/coach";

/** Cloudflare Workers Workflow Routes.  */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function cfWorkflowRoutes(db: Db): Hono<{ Bindings: Env }> {
  console.log("🚀 ~ db:", db);
  const app = new Hono<{ Bindings: Env }>();

  // this WF is responsible for gathering context -> analize the week -> generate the next one from that result
  app.post("/complete-week", async (bindingCtx) => {
    const { req, env } = bindingCtx;

    const { clientId } = await req.json<{ clientId: string }>();

    // 1- update db week to completed & return for analysis
    const completedWeek = await completeWeekV2(db, clientId);
    console.log("🚀 ~ completedWeek:", completedWeek);

    // 2- get current plan
    const currentPlan = await getPlan(db, clientId);
    console.log("🚀 ~ currentPlan:", currentPlan);
    // 3- get coach rules
    const rules = COACHING_RULES;
    console.log("🚀 ~ rules:", rules);
    // 4- get user profile
    const userProfile = await getProfile(db, clientId);
    console.log("🚀 ~ userProfile:", userProfile);
    // 5 - analyze week with all this data

    const instance = await env.STRENGTHSYNC_WORKFLOW.create();
    console.log("🚀 ~ instance:", instance);
    await instance.sendEvent({
      type: "complete-week",
      payload: {
        clientId,
      },
    });
    return Response.json({
      instanceId: instance.id,
      details: await instance.status(),
    });
  });

  return app;
}
