import { Hono } from "hono";

import { getActivePlan, getPlan, type Db } from "../db/index.ts";

import { errorResponse } from "../lib/errors.ts";
import { isResponse, parseUuidParam } from "../lib/validate.ts";

/**
 * Public plan read routes. Plan creation/activation is workflow-only in the
 * MVP: the browser never sends a plan document or activates a plan directly
 * (docs/architecture/api_contracts.md).
 */
export function planRoutes(db: Db): Hono {
  const app = new Hono();

  app.get("/clients/:clientId/plans/active", async (c) => {
    const clientId = parseUuidParam(c, c.req.param("clientId"), "clientId");
    if (isResponse(clientId)) return clientId;
    const plan = await getActivePlan(db, clientId);
    if (!plan) {
      return errorResponse(
        c,
        404,
        "active_plan_not_found",
        `client ${clientId} has no active plan`,
      );
    }
    return c.json({ plan });
  });

  app.get("/clients/:clientId/plans/:planId", async (c) => {
    const clientId = parseUuidParam(c, c.req.param("clientId"), "clientId");
    if (isResponse(clientId)) return clientId;
    const planId = parseUuidParam(c, c.req.param("planId"), "planId");
    if (isResponse(planId)) return planId;
    const plan = await getPlan(db, clientId);
    if (!plan) {
      return errorResponse(
        c,
        404,
        "plan_not_found",
        `plan ${planId} not found`,
      );
    }
    return c.json({ plan });
  });

  return app;
}
