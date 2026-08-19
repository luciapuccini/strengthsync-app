import type { OpenAPIHono } from '@hono/zod-openapi';

import { activateGeneratedPlan, type Db } from './db/index.ts';
import { createTestDb } from './db/testing/index.ts';
import type { PlanDay, Week } from './domain/model/index.ts';

import { createApp, type AppConfig } from './app.ts';

/**
 * What survives the amputation in `issues/011-amputate-old-auth.md`.
 *
 * `TestClient`, `signUpViaApi` and `upsertProfileViaApi` are gone: every one of
 * them obtained an authenticated athlete by posting to the sign-up route and
 * scraping the session cookie, and that route no longer exists. Replacing them
 * is the backbone of `issues/012-token-verification-and-provisioning.md` — the
 * kit will mint a `TestClient` from a seeded athlete plus identity row and the
 * injected verifier, keeping the same `id` / `headers` / `jsonHeaders` shape so
 * the restored tests read the way they did.
 *
 * What is left below is deliberately the part that never knew about
 * authentication: it sets up training data through the repositories, below the
 * HTTP boundary, so issue 012's restored tests can use it verbatim.
 */

export function createTestApp(overrides: Partial<AppConfig> = {}): OpenAPIHono {
  return createApp({ db: createTestDb(), ...overrides });
}

export const weekTemplate: PlanDay[] = [
  {
    day_index: 1,
    type: 'upper_body',
    notes: null,
    exercises: [
      {
        exercise_key: 'press_banca',
        name: 'Bench press',
        series: 4,
        reps: 8,
        rest_time_sec: 120,
        weight_kg: 60,
        notes: null,
      },
    ],
  },
];

export async function activateGeneratedPlanViaRepository(
  db: Db,
  clientId: string,
  workflowId: string,
): Promise<{ plan: { id: string }; first_week: Week }> {
  const result = await activateGeneratedPlan(db, clientId, {
    workflow_id: workflowId,
    plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
  });
  return { plan: { id: result.plan.id }, first_week: result.first_week };
}
