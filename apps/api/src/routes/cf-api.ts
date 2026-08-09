import { Hono } from "hono";
import type { Env } from "../env.ts";

/** Cloudflare Workers Workflow Routes.  */
export function cfWorkflowRoutes(): Hono<{ Bindings: Env }> {
  const app = new Hono<{ Bindings: Env }>();

  app.post("/complete-week", async (bindingCtx) => {
    const { req, env } = bindingCtx;
    const { clientId } = await req.json<{ clientId: string }>();
    const instance = await env.STRENGTHSYNC_WORKFLOW.create({
      params: {
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
