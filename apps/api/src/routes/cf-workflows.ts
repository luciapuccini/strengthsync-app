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
    const url = new URL(req.url);
    const instanceId = url.searchParams.get("instanceId");

    if (instanceId) {
      const instance = await env.STRENGTHSYNC_WORKFLOW.get(instanceId);
      return Response.json(await instance.status());
    }

    const instance = await env.STRENGTHSYNC_WORKFLOW.create();
    return Response.json({ instanceId: instance.id });
  });

  return app;
}
