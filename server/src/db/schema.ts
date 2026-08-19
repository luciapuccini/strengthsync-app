import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import {
  CLIENT_STATUSES,
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
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [index('clients_coach_id_idx').on(t.coach_id)],
);

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
  height_cm: real('height_cm'),
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
