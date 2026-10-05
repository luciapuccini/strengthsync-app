import type { OpenAPIHono } from '@hono/zod-openapi';

import { activateGeneratedPlan, claimSubject, createClient, type Db } from './db/index.ts';
import { createTestDb } from './db/testing/index.ts';
import type { PlanDay, Week } from './domain/model/index.ts';

import { createApp, type AppConfig } from './app.ts';
import type { TokenVerifier } from './lib/auth.ts';
import type { ManagementClient, ManagementUser } from './lib/management.ts';

export const stubVerifier: TokenVerifier = async (token) =>
  token.startsWith('auth0|') ? { sub: token } : null;

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
        weight_lb: 135,
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
