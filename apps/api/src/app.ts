import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { HTTPException } from "hono/http-exception";

import { RepoError, type Db } from "@strengthsync/db";

import { errorResponse, repoErrorResponse } from "./lib/errors.ts";
import { clientRoutes } from "./routes/clients.ts";
import { planRoutes } from "./routes/plans.ts";
import { weekRoutes } from "./routes/weeks.ts";
import { cfWorkflowRoutes } from "./routes/cf-api.ts";

export type AppConfig = {
  db: Db;
  /** Shared coach credential (docs/architecture/stack.md). */
  basicAuth: { username: string; password: string };
};

export function createApp(config: AppConfig): Hono {
  const app = new Hono();

  app.onError((err, c) => {
    // hono's own HTTP errors (e.g. the 401 from basicAuth).
    if (err instanceof HTTPException) return err.getResponse();
    if (err instanceof RepoError) return repoErrorResponse(c, err);
    console.error("[api] unhandled error", err);
    return errorResponse(c, 500, "internal_error", "internal error");
  });

  // Unauthenticated liveness (docs/architecture/api_contracts.md).
  app.get("/health", (c) => c.json({ ok: true }));

  // Public API: shared Basic credential on every /api/* route (production only).
  // wrangler dev sets NODE_ENV=development; deploy/build set production.
  if (process.env.NODE_ENV === "production") {
    app.use(
      "/api/*",
      basicAuth({
        username: config.basicAuth.username,
        password: config.basicAuth.password,
      }),
    );
  }
  app.route("/api", clientRoutes(config.db));
  app.route("/api", planRoutes(config.db));
  app.route("/api", weekRoutes(config.db));
  app.route("/wf", cfWorkflowRoutes());

  return app;
}
