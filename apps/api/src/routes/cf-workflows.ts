import type { Db } from "@strengthsync/db";
import { Hono } from "hono";
import type { Env } from "../env.ts";

/** Cloudflare Workers Workflow Routes.  */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function cfWorkflowRoutes(db: Db): Hono<{ Bindings: Env }> {
  console.log("🚀 ~ db:", db);
  const app = new Hono<{ Bindings: Env }>();

  app.post("/workflows/strengthsync", async (bindingCtx) => {
    const { req, env } = bindingCtx;
    const { clientId, weekId } = await req.parseBody<{
      clientId: string;
      weekId: string;
    }>();

    const instance = await env.STRENGTHSYNC_WORKFLOW.create();
    console.log("🚀 ~ instance:", instance);
    await instance.sendEvent({
      type: "complete-week",
      payload: {
        clientId,
        weekId,
      },
    });
    return Response.json({
      instanceId: instance.id,
      details: await instance.status(),
    });
  });

  return app;
}
