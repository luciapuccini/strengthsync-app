import { and, desc, eq } from "drizzle-orm";

import type { ActivateGeneratedPlanCommand } from "@strengthsync/domain/contracts";
import type { Plan, Week } from "@strengthsync/domain/model";

import { addDays, nowIso, startOfISOWeek, todayIso } from "../dates.ts";
import type { Db } from "../db.ts";
import { plans, weeks } from "../schema.ts";
import {
  buildScheduleFromTemplate,
  findExistingActivation,
} from "./internal-helpers.ts";
import { toWeek } from "./weeks.ts";

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

export async function getActivePlan(
  db: Db,
  clientId: string,
): Promise<Plan | null> {
  const rows = await db
    .select()
    .from(plans)
    .where(and(eq(plans.client_id, clientId), eq(plans.status, "active")))
    .limit(1);
  const row = rows[0];
  return row ? toPlan(row) : null;
}

export async function getPlan(db: Db, clientId: string): Promise<Plan> {
  const rows = await db
    .select()
    .from(plans)
    .where(and(eq(plans.client_id, clientId), eq(plans.status, "active")))
    .limit(1);
  const row = rows[0];

  if (!row) {
    throw new Error("No plan found for client");
  }
  return toPlan(row);
}

/**
 * Archive the prior active plan, create + activate the generated plan, and
 * create week 1 from its canonical template — atomically via D1 `batch()`.
 * Idempotent by `workflow_id`.
 * V2 lives here during migration; the original in internal.ts is retained for legacy callers.
 */
export async function activateGeneratedPlanV2(
  db: Db,
  clientId: string,
  cmd: ActivateGeneratedPlanCommand,
): Promise<{ plan: Plan; first_week: Week }> {
  const existing = await findExistingActivation(db, clientId, cmd.workflow_id);
  if (existing) return existing;

  const now = nowIso();
  const start = startOfISOWeek(todayIso());
  const planRow = {
    id: crypto.randomUUID(),
    client_id: clientId,
    label: cmd.plan.label,
    status: "active" as const,
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
    status: "in_flight" as const,
    schedule: buildScheduleFromTemplate(cmd.plan.week_template, start),
    workflow_id: cmd.workflow_id,
    created_at: now,
    updated_at: now,
  };

  await db.batch([
    db
      .update(plans)
      .set({ status: "archived", updated_at: now })
      .where(and(eq(plans.client_id, clientId), eq(plans.status, "active"))),
    db.insert(plans).values(planRow),
    db.insert(weeks).values(weekRow),
  ]);

  return { plan: toPlan(planRow), first_week: toWeek(weekRow) };
}
