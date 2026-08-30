import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { streamSSE } from 'hono/streaming';

import { streamAgentRuntime } from '../../agent/agent-core.ts';
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
import type { AuthVariables } from '../../lib/auth.ts';
import { defaultHook } from '../../lib/validation-error.ts';
import { conflict, eventStream, invalidInput, json, notFound, unauthorized } from '../shared.ts';

import {
  PlanIdParamSchema,
  PlanResponseSchema,
  PlanStreamEventSchema,
  type PlanStreamEvent,
} from './schemas.ts';

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
  description:
    'Streams the generation as it happens. The guards below answer JSON; once the stream is open the status line is spent and the plan itself is read back from the database, not from the stream.',
  responses: {
    200: eventStream('Generation progress, one JSON event per frame', PlanStreamEventSchema),
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
export function planRoutes(db: Db): OpenAPIHono<{ Variables: AuthVariables; Bindings: Env }> {
  const app = new OpenAPIHono<{ Variables: AuthVariables; Bindings: Env }>({ defaultHook });

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
    const generation = streamAgentRuntime({
      apiKey: c.env.OPENAI_API_KEY,
      model: c.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
      callSite: 'first-plan',
      system,
      prompt,
      outSchema: GeneratedPlanInputSchema,
    });

    // Plumbing only from here: open the stream, emit what the partial output
    // says, activate, emit `ready`, close. A throw anywhere below ends the
    // stream without `ready`, which the browser reads as a failure — the
    // terminal `failed` event that carries a code and a message is a later
    // slice.
    return streamSSE(c, async (stream) => {
      const write = (event: PlanStreamEvent): Promise<void> =>
        stream.writeSSE({ data: JSON.stringify(event) });

      // `total_weeks` follows `label` in the generated shape, so by the time
      // it parses the label is whole rather than a growing prefix. Key order
      // is load-bearing here: reordering that schema delays the header.
      let announced = false;
      for await (const partial of generation.partialOutputStream) {
        if (announced || partial.label === undefined || partial.total_weeks === undefined) continue;
        announced = true;
        await write({ type: 'meta', label: partial.label, total_weeks: partial.total_weeks });
      }

      const { plan, first_week } = await activateGeneratedPlan(db, clientId, {
        workflow_id: `first-plan:${clientId}`,
        plan: await generation.output,
      });
      await write({ type: 'ready', plan_id: plan.id, first_week_id: first_week.id });
    });
  });

  return app;
}
