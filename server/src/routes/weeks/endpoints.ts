import { OpenAPIHono, createRoute } from '@hono/zod-openapi';

import {
  getClient,
  getCurrentWeek,
  listWeeks,
  saveDay,
  updateDayLog,
  type Db,
} from '../../db/index.ts';
import type { WeekStatus } from '../../domain/model/index.ts';

import type { SessionVariables } from '../../lib/session.ts';
import { defaultHook } from '../../lib/validation-error.ts';
import { invalidInput, json, notFound, unauthorized } from '../shared.ts';

import {
  DayParamsSchema,
  SaveDayLogSchema,
  UpdateDayLogSchema,
  WeekListQuerySchema,
  WeekListResponseSchema,
  WeekResponseSchema,
} from './schemas.ts';

const getMyCurrentWeekRoute = createRoute({
  method: 'get',
  path: '/me/weeks/current',
  summary: "Get the signed-in client's current in-flight week",
  responses: {
    200: json('Week found', WeekResponseSchema),
    401: unauthorized,
    404: notFound,
  },
});

const listMyWeeksRoute = createRoute({
  method: 'get',
  path: '/me/weeks',
  summary: "List the signed-in client's weeks",
  request: { query: WeekListQuerySchema },
  responses: {
    200: json('Weeks found', WeekListResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
});

const saveMyDayLogRoute = createRoute({
  method: 'post',
  path: '/me/weeks/{weekId}/days/{dayIndex}/save',
  summary: "Save a day's exercise logs and mark the day completed",
  request: {
    params: DayParamsSchema,
    body: { content: { 'application/json': { schema: SaveDayLogSchema } } },
  },
  responses: {
    200: json('Day saved', WeekResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
});

const updateMyDayLogRoute = createRoute({
  method: 'patch',
  path: '/me/weeks/{weekId}/days/{dayIndex}',
  summary: 'Low-level day log patch (tests/tools)',
  request: {
    params: DayParamsSchema,
    body: { content: { 'application/json': { schema: UpdateDayLogSchema } } },
  },
  responses: {
    200: json('Day patched', WeekResponseSchema),
    400: invalidInput,
    401: unauthorized,
    404: notFound,
  },
});

/**
 * Public week read routes + the day log writes.
 *
 * RepoError from the write paths propagates to app.ts's onError, which maps it
 * to the envelope — the local try/catch the imperative version needed is gone.
 *
 * Every route takes the athlete from the verified session — see the note in
 * `routes/clients/endpoints.ts`. The week id in the write paths is the caller's
 * only free choice, and the repository scopes it to them.
 */
export function weekRoutes(db: Db): OpenAPIHono<{ Variables: SessionVariables }> {
  const app = new OpenAPIHono<{ Variables: SessionVariables }>({ defaultHook });

  app.openapi(getMyCurrentWeekRoute, async (c) => {
    const week = await getCurrentWeek(db, c.get('clientId'));
    if (!week) {
      return c.json(
        { error: { code: 'current_week_not_found', message: 'no in_flight week' } },
        404,
      );
    }
    return c.json({ week }, 200);
  });

  app.openapi(listMyWeeksRoute, async (c) => {
    const clientId = c.get('clientId');
    // The session outlives the row it names by up to thirty days, so a deleted
    // athlete can still present a valid cookie.
    if (!(await getClient(db, clientId))) {
      return c.json({ error: { code: 'client_not_found', message: 'client not found' } }, 404);
    }
    const { status, planId } = c.req.valid('query');
    // Built conditionally rather than spread: exactOptionalPropertyTypes means
    // an explicit `undefined` is not assignable to an optional property.
    const filter: { status?: WeekStatus; planId?: string } = {};
    if (status !== undefined) filter.status = status;
    if (planId !== undefined) filter.planId = planId;
    return c.json({ weeks: await listWeeks(db, clientId, filter) }, 200);
  });

  app.openapi(saveMyDayLogRoute, async (c) => {
    const { weekId, dayIndex } = c.req.valid('param');
    const week = await saveDay(db, c.get('clientId'), weekId, dayIndex, c.req.valid('json'));
    return c.json({ week }, 200);
  });

  app.openapi(updateMyDayLogRoute, async (c) => {
    const { weekId, dayIndex } = c.req.valid('param');
    const week = await updateDayLog(db, c.get('clientId'), weekId, dayIndex, c.req.valid('json'));
    return c.json({ week }, 200);
  });

  return app;
}
