import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import {
  CLIENT_STATUSES,
  UNIT_PREFERENCES,
  PLAN_STATUSES,
  WEEK_STATUSES,
  type JsonValue,
  type PlanDay,
  type WeekDay,
} from '../domain/model/index.ts';

/**
 * Drizzle/D1 schema for the five core records: Coach → Client →
 * ClientProfile / Plan / Week. See docs/architecture/domain_model.md.
 *
 * `week_template` and `schedule` are JSON columns validated by the domain
 * Zod schemas at the API/persistence boundary. `workflow_id` columns are
 * idempotency keys for the workflow — or request — that created each row;
 * they are not part of the public domain model.
 */

export const coaches = sqliteTable('coaches', {
  id: text('id').primaryKey(),
  display_name: text('display_name').notNull(),
  auth_subject_id: text('auth_subject_id'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const clients = sqliteTable(
  'clients',
  {
    id: text('id').primaryKey(),
    coach_id: text('coach_id')
      .notNull()
      .references(() => coaches.id),
    display_name: text('display_name').notNull(),
    status: text('status', { enum: CLIENT_STATUSES }).notNull(),
    /**
     * Which units this athlete reads the app in. Storage is always imperial —
     * this only decides what the client renders. Defaults to imperial because
     * that is the overwhelming majority; see docs/architecture/domain_model.md.
     */
    unit_preference: text('unit_preference', { enum: UNIT_PREFERENCES })
      .notNull()
      .default('imperial'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [index('clients_coach_id_idx').on(t.coach_id)],
);

/**
 * Who an athlete is at the identity provider. See docs/architecture/auth.md.
 *
 * The subject is looked up, never used as a key. It is per-connection and opaque
 * — the same person signing in with a password and with Apple is two subjects,
 * and would be two athletes here, because account linking is deliberately off
 * (`issues/auth0-migration/prd.md`). Internal ids never change, so every foreign
 * key in the training data is indifferent to all of this. That separation is the
 * whole reason this is its own table rather than a column on `clients`: it is
 * where the provider's vocabulary stops.
 *
 * `client_id` is the primary key, so an athlete has exactly one identity — the
 * current invariant, stated rather than merely observed. Enabling account
 * linking later means a migration to a surrogate key, which is mechanical.
 *
 * The unique constraint on `subject` is load-bearing, not hygiene. D1 has no
 * transaction spanning the two inserts that provision an athlete, so it is the
 * only thing standing between two simultaneous first requests and two athletes
 * for one person. `resolveClientId` in `lib/identity.ts` is written around it.
 *
 * `email` is a cache of what the Management API said at provisioning time, kept
 * so the operator can find an athlete by the address they were invited at
 * without an API round trip. Nothing authenticates against it.
 */
export const clientIdentities = sqliteTable('client_identities', {
  client_id: text('client_id')
    .primaryKey()
    .references(() => clients.id),
  subject: text('subject').notNull().unique(),
  email: text('email').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

// Factory, not a shared builder: drizzle column builders bind their column
// name on first use, so each column needs its own call.
const jsonRecord = () => text({ mode: 'json' }).$type<Record<string, JsonValue>>();

export const clientProfiles = sqliteTable('client_profiles', {
  id: text('id').primaryKey(),
  client_id: text('client_id')
    .notNull()
    .unique()
    .references(() => clients.id),
  snapshot_date: text('snapshot_date').notNull(),
  sex: text('sex'),
  age: integer('age'),
  height_in: real('height_in'),
  goals: jsonRecord().notNull(),
  body_composition: jsonRecord().notNull(),
  strength_loads: jsonRecord().notNull(),
  nutrition: jsonRecord(),
  activities: jsonRecord(),
  schedule_preferences: jsonRecord(),
  notes: text('notes'),
  updated_at: text('updated_at').notNull(),
});

export const plans = sqliteTable(
  'plans',
  {
    id: text('id').primaryKey(),
    client_id: text('client_id')
      .notNull()
      .references(() => clients.id),
    label: text('label').notNull(),
    status: text('status', { enum: PLAN_STATUSES }).notNull(),
    total_weeks: integer('total_weeks').notNull(),
    week_template: text('week_template', { mode: 'json' }).notNull().$type<PlanDay[]>(),
    rationale: text('rationale'),
    activated_at: text('activated_at'),
    /** Idempotency key: the workflow — or request — that created this plan. */
    workflow_id: text('workflow_id'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    // Invariant: at most one active plan per client.
    uniqueIndex('plans_one_active_per_client')
      .on(t.client_id)
      .where(sql`status = 'active'`),
    index('plans_client_id_idx').on(t.client_id),
  ],
);

export const weeks = sqliteTable(
  'weeks',
  {
    id: text('id').primaryKey(),
    client_id: text('client_id')
      .notNull()
      .references(() => clients.id),
    plan_id: text('plan_id')
      .notNull()
      .references(() => plans.id),
    week_index: integer('week_index').notNull(),
    start_date: text('start_date').notNull(),
    end_date: text('end_date').notNull(),
    status: text('status', { enum: WEEK_STATUSES }).notNull(),
    /** Snapshot of the planned work for this week, including AI adjustments. */
    schedule: text('schedule', { mode: 'json' }).notNull().$type<WeekDay[]>(),
    /** Idempotency key: the workflow — or request — that created this week. */
    workflow_id: text('workflow_id'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    // Invariant: at most one in_flight week per client.
    uniqueIndex('weeks_one_in_flight_per_client')
      .on(t.client_id)
      .where(sql`status = 'in_flight'`),
    index('weeks_client_plan_idx').on(t.client_id, t.plan_id),
  ],
);
