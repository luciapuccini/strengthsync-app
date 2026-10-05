import { and, desc, eq } from 'drizzle-orm';

import type { ActivateGeneratedPlanCommand } from '../../domain/workflow.ts';
import type { Plan, Week } from '../../domain/model/index.ts';

import { addDays, nowIso, todayIso } from '../dates.ts';
import type { Db } from '../db.ts';
import { plans, weeks } from '../schema.ts';
import { buildScheduleFromTemplate, findExistingActivation } from './internal-helpers.ts';
import { toWeek } from './weeks.ts';

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

export async function findPlanById(db: Db, clientId: string, planId: string): Promise<Plan | null> {
  const rows = await db
    .select()
    .from(plans)
    .where(and(eq(plans.client_id, clientId), eq(plans.id, planId)))
    .limit(1);
  const row = rows[0];
  return row ? toPlan(row) : null;
}

export async function getActivePlanOrThrow(db: Db, clientId: string): Promise<Plan> {
  const plan = await getActivePlan(db, clientId);
  if (!plan) {
    throw new Error(`client ${clientId} has no active plan`);
  }
  return plan;
}

export async function activateGeneratedPlan(
  db: Db,
  clientId: string,
  cmd: ActivateGeneratedPlanCommand,
): Promise<{ plan: Plan; first_week: Week }> {
  const existing = await findExistingActivation(db, clientId, cmd.workflow_id);
  if (existing) return existing;

  const now = nowIso();
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

export async function deletePlans(db: Db, clientId: string): Promise<void> {
  await db.delete(plans).where(eq(plans.client_id, clientId));
}
