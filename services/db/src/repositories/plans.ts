import { and, desc, eq } from "drizzle-orm";

import type { Plan } from "@strengthsync/domain/model";

import type { Db } from "../db.ts";
import { plans } from "../schema.ts";

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
