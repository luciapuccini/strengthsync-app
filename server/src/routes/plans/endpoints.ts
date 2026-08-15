import { OpenAPIHono, createRoute } from '@hono/zod-openapi';

import { getAgentRuntime } from '../../agent/agent-core.ts';
import { buildFirstPlanPrompt, COACHING_RULES } from '../../domain/coach/index.ts';
import { GeneratedPlanInputSchema } from '../../domain/workflow.ts';
import {
  activateGeneratedPlan,
  findPlanById,
  findProfile,
  getActivePlan,
  type Db,
} from '../../db/index.ts';

import type { Env } from '../../env.ts';
import type { SessionVariables } from '../../lib/session.ts';
import { defaultHook } from '../../lib/validation-error.ts';
import { conflict, invalidInput, json, notFound, unauthorized } from '../shared.ts';

import { GeneratePlanResponseSchema, PlanIdParamSchema, PlanResponseSchema } from './schemas.ts';

const getMyActivePlanRoute = createRoute({
  method: 'get',
  path: '/me/plans/active',
  summary: "Get the signed-in client's active plan",
  responses: {
    200: json('Plan found', PlanResponseSchema),
    401: unauthorized,
    404: notFound,
  },
});

const getMyPlanRoute = createRoute({
  method: 'get',
  path: '/me/plans/{planId}',
  summary: "Get one of the signed-in client's plans by id",
  request: { params: PlanIdParamSchema },
  responses: {
    200: json('Plan found', PlanResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
});

const postGeneratePlanRoute = createRoute({
  method: 'post',
  path: '/me/plans/generate',
  summary: "Generate and activate the signed-in client's first plan",
  responses: {
    200: json('Plan generated and activated', GeneratePlanResponseSchema),
    401: unauthorized,
    409: conflict,
  },
});

/**
 * Plan routes for the signed-in athlete. Generation makes the browser a plan
 * creator too, alongside the weekly workflow — see
 * `docs/architecture/api_contracts.md`.
 *
 * All three take the athlete from the verified session — see the note in
 * `routes/clients/endpoints.ts`.
 */
export function planRoutes(db: Db): OpenAPIHono<{ Variables: SessionVariables; Bindings: Env }> {
  const app = new OpenAPIHono<{ Variables: SessionVariables; Bindings: Env }>({ defaultHook });

  app.openapi(getMyActivePlanRoute, async (c) => {
    const plan = await getActivePlan(db, c.get('clientId'));
    if (!plan) {
      return c.json({ error: { code: 'active_plan_not_found', message: 'no active plan' } }, 404);
    }
    return c.json({ plan }, 200);
  });

  // Scoped to the caller, so naming someone else's plan id finds nothing
  // rather than reading it.
  app.openapi(getMyPlanRoute, async (c) => {
    const { planId } = c.req.valid('param');
    const plan = await findPlanById(db, c.get('clientId'), planId);
    if (!plan) {
      return c.json(
        { error: { code: 'plan_not_found', message: `plan ${planId} not found` } },
        404,
      );
    }
    return c.json({ plan }, 200);
  });

  // Guards run before the model call: no profile and an active plan already
  // existing are both refused without spending a token. A retry that arrives
  // while the first call is still in flight is what the activation command's
  // own workflow_id idempotency covers, not this guard — a retry that arrives
  // after a completed activation finds the new active plan here instead, which
  // is fine, because the browser that owns the first response has already
  // moved on.
  app.openapi(postGeneratePlanRoute, async (c) => {
    const clientId = c.get('clientId');

    const profile = await findProfile(db, clientId);
    if (!profile) {
      return c.json({ error: { code: 'profile_required', message: 'client has no profile' } }, 409);
    }

    if (await getActivePlan(db, clientId)) {
      return c.json(
        { error: { code: 'plan_already_active', message: 'client already has an active plan' } },
        409,
      );
    }

    const { system, prompt } = buildFirstPlanPrompt(profile, COACHING_RULES);
    const generated = await getAgentRuntime({
      apiKey: c.env.OPENAI_API_KEY,
      model: c.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
      callSite: 'first-plan',
      system,
      prompt,
      outSchema: GeneratedPlanInputSchema,
    });

    const { plan, first_week } = await activateGeneratedPlan(db, clientId, {
      workflow_id: `first-plan:${clientId}`,
      plan: generated,
    });
    return c.json({ plan, first_week }, 200);
  });

  return app;
}
