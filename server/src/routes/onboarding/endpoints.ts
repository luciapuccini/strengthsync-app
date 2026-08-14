import { OpenAPIHono, createRoute } from '@hono/zod-openapi';

import { todayIso } from '../../db/dates.ts';
import { getClient, upsertProfile, type Db } from '../../db/index.ts';
import { mapAnswersToProfileWrite } from '../../domain/onboarding/index.ts';

import type { SessionVariables } from '../../lib/session.ts';
import { defaultHook } from '../../lib/validation-error.ts';
import { ClientProfileResponseSchema } from '../clients/schemas.ts';
import { invalidInput, json, notFound, unauthorized } from '../shared.ts';

import { OnboardingAnswersRequestSchema } from './schemas.ts';

const postOnboardingRoute = createRoute({
  method: 'post',
  path: '/me/onboarding',
  summary: "Save the signed-in client's onboarding answers as their coaching profile",
  request: {
    body: { content: { 'application/json': { schema: OnboardingAnswersRequestSchema } } },
  },
  responses: {
    200: json('Profile saved', ClientProfileResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
});

/**
 * The one-time write that turns a questionnaire into a coaching profile. See
 * docs/architecture/api_contracts.md. Composes the mapper and the repository
 * directly, in the same shape as the clients and auth handlers — no
 * use-case layer.
 */
export function onboardingRoutes(db: Db): OpenAPIHono<{ Variables: SessionVariables }> {
  const app = new OpenAPIHono<{ Variables: SessionVariables }>({ defaultHook });

  app.openapi(postOnboardingRoute, async (c) => {
    const clientId = c.get('clientId');
    // The session outlives the row it names by up to thirty days, so a deleted
    // athlete can still present a valid cookie.
    if (!(await getClient(db, clientId))) {
      return c.json({ error: { code: 'client_not_found', message: 'client not found' } }, 404);
    }
    const write = mapAnswersToProfileWrite(c.req.valid('json'));
    const profile = await upsertProfile(db, clientId, { ...write, snapshot_date: todayIso() });
    return c.json({ profile }, 200);
  });

  return app;
}
