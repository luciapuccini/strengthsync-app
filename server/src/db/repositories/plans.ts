import { and, desc, eq } from 'drizzle-orm';

import type { ActivateGeneratedPlanCommand } from '../../domain/workflow.ts';
import type { Plan, Week } from '../../domain/model/index.ts';

import { addDays, nowIso, todayIso } from '../dates.ts';
import type { Db } from '../db.ts';
import { plans, weeks } from '../schema.ts';
import { buildScheduleFromTemplate, findExistingActivation } from './internal-helpers.ts';
import { toWeek } from './weeks.ts';

/** Strip persistence-only columns (workflow_id) from a plan row. */
export function toPlan(row: typeof plans.$inferSelect): Plan {
  const { workflow_id: _workflowId, ...plan } = row;
  return plan;
}

export async function listPlans(db: Db, clientId: string): Promise<Plan[]> {
  const rows = await db
    .select()
    .from(plans)
    .where(eq(plans.client_id, clientId))
    .orderBy(desc(plans.created_at));
  return rows.map(toPlan);
}

export async function getActivePlan(db: Db, clientId: string): Promise<Plan | null> {
  const rows = await db
    .select()
    .from(plans)
    .where(and(eq(plans.client_id, clientId), eq(plans.status, 'active')))
    .limit(1);
  const row = rows[0];
  return row ? toPlan(row) : null;
}

/** One of a client's plans, by id, or null when they have no such plan. */
export async function findPlanById(db: Db, clientId: string, planId: string): Promise<Plan | null> {
  const rows = await db
    .select()
    .from(plans)
    .where(and(eq(plans.client_id, clientId), eq(plans.id, planId)))
    .limit(1);
  const row = rows[0];
  return row ? toPlan(row) : null;
}

/**
 * The active plan, or a thrown error. For the workflow, which cannot proceed
 * without one and has no way to answer a caller.
 *
 * Named `getPlan` until the route deletion in `issues/auth/013` left the
 * workflow as its only caller: it read the *active* plan while sitting behind
 * `GET /clients/{clientId}/plans/{planId}`, which therefore answered with the
 * active plan whatever id was asked for. Renamed so the name cannot mislead
 * the next caller, and reduced to a wrapper so the query lives in one place.
 */
export async function getActivePlanOrThrow(db: Db, clientId: string): Promise<Plan> {
  const plan = await getActivePlan(db, clientId);
  if (!plan) {
    throw new Error(`client ${clientId} has no active plan`);
  }
  return plan;
}

/**
 * Archive the prior active plan, create + activate the generated plan, and
 * create week 1 from its canonical template — atomically via D1 `batch()`.
 * Idempotent by `workflow_id`.
 */
export async function activateGeneratedPlan(
  db: Db,
  clientId: string,
  cmd: ActivateGeneratedPlanCommand,
): Promise<{ plan: Plan; first_week: Week }> {
  const existing = await findExistingActivation(db, clientId, cmd.workflow_id);
  if (existing) return existing;

  const now = nowIso();
  // Week 1 runs from the day the athlete activates, not from the Monday of the
  // ISO week containing it: anchoring to Monday put days the athlete never
  // trained and cannot log in the past for the five-in-seven who sign up
  // mid-week. Week 2 onward chains off `end_date + 1` in `saveNextWeek`, so the
  // offset holds for that athlete from here on.
  const start = todayIso();
  const planRow = {
    id: crypto.randomUUID(),
    client_id: clientId,
    label: cmd.plan.label,
    status: 'active' as const,
    total_weeks: cmd.plan.total_weeks,
    week_template: cmd.plan.week_template,
    rationale: cmd.plan.rationale ?? null,
    activated_at: now,
    workflow_id: cmd.workflow_id,
    created_at: now,
    updated_at: now,
  };
  const weekRow = {
    id: crypto.randomUUID(),
    client_id: clientId,
    plan_id: planRow.id,
    week_index: 1,
    start_date: start,
    end_date: addDays(start, 6),
    status: 'in_flight' as const,
    schedule: buildScheduleFromTemplate(cmd.plan.week_template, start),
    workflow_id: cmd.workflow_id,
    created_at: now,
    updated_at: now,
  };

  await db.batch([
    db
      .update(plans)
      .set({ status: 'archived', updated_at: now })
      .where(and(eq(plans.client_id, clientId), eq(plans.status, 'active'))),
    db.insert(plans).values(planRow),
    db.insert(weeks).values(weekRow),
  ]);

  return { plan: toPlan(planRow), first_week: toWeek(weekRow) };
}
