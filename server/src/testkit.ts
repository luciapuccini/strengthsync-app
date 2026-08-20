import type { OpenAPIHono } from '@hono/zod-openapi';

import { activateGeneratedPlan, claimSubject, createClient, type Db } from './db/index.ts';
import { createTestDb } from './db/testing/index.ts';
import type { PlanDay, Week } from './domain/model/index.ts';

import { createApp, type AppConfig } from './app.ts';
import type { TokenVerifier } from './lib/auth.ts';
import type { ManagementClient, ManagementUser } from './lib/management.ts';

/**
 * The kit the HTTP-level tests are built from.
 *
 * Rebuilt in `issues/012-token-verification-and-provisioning.md` on top of
 * bearer tokens. What it replaced obtained an authenticated athlete by posting
 * to a sign-up route and scraping a session cookie; there is no such route now,
 * and identity arrives already minted.
 *
 * The `TestClient` shape — `id`, `headers`, `jsonHeaders` — is deliberately the
 * one the deleted kit had, so the restored cases read the way they did and the
 * diff is about authentication rather than about test style.
 */

/**
 * A token is its own subject.
 *
 * The suite never verifies a signature. Real verification needs the tenant's
 * key set, and the trade that keeps the gate offline and fast is recorded in
 * `issues/auth0-migration/prd.md` — `createTokenVerifier` in `lib/auth.ts` is
 * the code this stands in for, and it is the one piece of this migration the
 * suite does not run.
 *
 * Rejecting anything that is not shaped like a subject is what lets the guard's
 * own tests say "malformed" and "expired" without minting anything: from the
 * guard's side every refusal by the verifier is the same refusal, which is
 * precisely the property those cases exist to pin.
 */
export const stubVerifier: TokenVerifier = async (token) =>
  token.startsWith('auth0|') ? { sub: token } : null;

/** A Management API that knows about whoever the test has told it about. */
export function stubManagement(users: Map<string, ManagementUser> = new Map()): ManagementClient {
  return {
    getUser: async (subject) => users.get(subject) ?? null,
    deleteUser: async (subject) => {
      users.delete(subject);
    },
  };
}

export type TestHarness = {
  app: OpenAPIHono;
  db: Db;
  /** Users the stubbed provider knows about; add to it to allow provisioning. */
  providerUsers: Map<string, ManagementUser>;
};

export function createTestHarness(overrides: Partial<AppConfig> = {}): TestHarness {
  const db = createTestDb();
  const providerUsers = new Map<string, ManagementUser>();
  const app = createApp({
    db,
    verifyToken: stubVerifier,
    management: stubManagement(providerUsers),
    ...overrides,
  });
  return { app, db, providerUsers };
}

export function createTestApp(overrides: Partial<AppConfig> = {}): OpenAPIHono {
  return createTestHarness(overrides).app;
}

export type TestClient = {
  id: string;
  subject: string;
  headers: Record<string, string>;
  jsonHeaders: Record<string, string>;
};

function asTestClient(id: string, subject: string): TestClient {
  const headers = { Authorization: `Bearer ${subject}` };
  return { id, subject, headers, jsonHeaders: { ...headers, 'Content-Type': 'application/json' } };
}

/**
 * An athlete who already exists, with a token that resolves to them.
 *
 * Seeded through the repositories rather than by letting the guard provision
 * them, so that a test about reading a plan is not also a test of provisioning.
 * The first-request path has its own cases, in `lib/identity.test.ts` and in the
 * guard's own file.
 */
export async function seedClient(db: Db, displayName = 'Ana'): Promise<TestClient> {
  const client = await createClient(db, { display_name: displayName });
  const subject = `auth0|${client.id}`;
  await claimSubject(db, {
    client_id: client.id,
    subject,
    email: `${displayName.toLowerCase()}@example.test`,
  });
  return asTestClient(client.id, subject);
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
