import { OpenAPIHono } from "@hono/zod-openapi";
import { basicAuth } from "hono/basic-auth";
import { HTTPException } from "hono/http-exception";

import { RepoError, type Db } from "./db/index.ts";

import { errorResponse, repoErrorResponse } from "./lib/errors.ts";
import { defaultHook } from "./lib/validation-error.ts";
import { clientRoutes } from "./routes/clients/endpoints.ts";
import { healthRoutes } from "./routes/health.ts";
import { planRoutes } from "./routes/plans/endpoints.ts";
import { weekRoutes } from "./routes/weeks/endpoints.ts";
import { cfWorkflowRoutes } from "./routes/wf/endpoints.ts";

export type AppConfig = {
  db: Db;
  /** Shared coach credential (docs/architecture/stack.md). */
  basicAuth: { username: string; password: string };
};

/** The document builder in `scripts/gen-openapi.ts` needs the OpenAPIHono type. */
export function createApp(config: AppConfig): OpenAPIHono {
  const app = new OpenAPIHono({ defaultHook });

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      // Hono rejects a syntactically malformed JSON body before any validator
      // runs, with a plain-text body. Keep every 400 in the API's envelope so
      // the UI's error handling (client/src/api/errors.ts) can read it.
      if (err.status === 400) {
        return errorResponse(c, 400, "invalid_input", err.message);
      }
      // Anything else hono raised itself (e.g. the 401 from basicAuth).
      return err.getResponse();
    }
    if (err instanceof RepoError) return repoErrorResponse(c, err);
    console.error("[api] unhandled error", err);
    return errorResponse(c, 500, "internal_error", "internal error");
  });

  // Unauthenticated liveness (docs/architecture/api_contracts.md).
  app.route("/", healthRoutes());

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
