import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { streamSSE } from 'hono/streaming';

import { streamAgentRuntime } from '../../agent/agent-core.ts';
import { NOTHING_SETTLED, settleEvents, type PartialPlan } from './day-settling.ts';
import { buildFirstPlanPrompt, COACHING_RULES } from '../../domain/coach/index.ts';
import { GeneratedPlanInputSchema } from '../../domain/workflow.ts';
import {
  activateGeneratedPlan,
  findPlanById,
  findProfile,
  getActivePlan,
  RepoError,
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
 * A post-open failure, as the API's ordinary error envelope.
 *
 * A `RepoError` keeps its own code, because it names something the athlete's
 * data did. Everything else — the model refusing, the completed object failing
 * its schema parse, the provider being unreachable — is one thing as far as
 * the browser is concerned: generation did not produce a plan, press retry.
 * The detail stays in the log, where it is useful and not guessable.
 */
function failedEvent(error: unknown): PlanStreamEvent {
  console.error('[api] first-plan generation failed', error);
  if (error instanceof RepoError) {
    return { type: 'failed', error: { code: error.code, message: error.message } };
  }
  return {
    type: 'failed',
    error: { code: 'plan_generation_failed', message: 'could not generate a plan' },
  };
}

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

    // Plumbing only from here: open the stream, ask the settling module what
    // the latest partial owes the athlete, write it, activate, say `ready`,
    // close. Everything after the stream opens is wrapped, because the status
    // line is already spent: a model failure, a rejected parse or a refused
    // write all leave as a terminal `failed` event, never as a status code.
    return streamSSE(c, async (stream) => {
      const write = async (events: PlanStreamEvent[]): Promise<void> => {
        for (const event of events) await stream.writeSSE({ data: JSON.stringify(event) });
      };

      try {
        // The last partial seen is replayed once with the stream ended, which
        // is what settles the seventh day. Key order is load-bearing upstream
        // of this: `label` and `total_weeks` precede the days in the generated
        // shape, so the header arrives early — reordering that schema would
        // quietly cost the feature most of its value.
        let settled = NOTHING_SETTLED;
        let latest: PartialPlan = {};
        for await (const partial of generation.partialOutputStream) {
          latest = partial;
          const step = settleEvents(settled, partial, { streamEnded: false });
          settled = step.state;
          await write(step.events);
        }
        await write(settleEvents(settled, latest, { streamEnded: true }).events);

        // `generation.output` is where a completed object that fails its schema
        // parse surfaces, so the parse is inside the guard too.
        const { plan, first_week } = await activateGeneratedPlan(db, clientId, {
          workflow_id: `first-plan:${clientId}`,
          plan: await generation.output,
        });
        await write([{ type: 'ready', plan_id: plan.id, first_week_id: first_week.id }]);
      } catch (error) {
        await write([failedEvent(error)]);
      }
    });
  });

  return app;
}
