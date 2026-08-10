import { and, desc, eq } from "drizzle-orm";

import type { SaveDayLog, UpdateDayLog } from "@strengthsync/domain/contracts";
import type {
  Plan,
  Week,
  WeekDay,
  WeekStatus,
} from "@strengthsync/domain/model";

import { addDays, nowIso, todayIso } from "../dates.ts";
import type { Db } from "../db.ts";
import { RepoError } from "../errors.ts";
import { weeks } from "../schema.ts";
import type { NextWeekSchedule } from "@strengthsync/domain/coach";

/** Strip persistence-only columns (workflow_id) from a week row. */
export function toWeek(row: typeof weeks.$inferSelect): Week {
  const { workflow_id: _workflowId, ...week } = row;
  return week;
}

export async function getCurrentWeek(
  db: Db,
  clientId: string,
): Promise<Week | null> {
  const rows = await db
    .select()
    .from(weeks)
    .where(and(eq(weeks.client_id, clientId), eq(weeks.status, "in_flight")))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const week = toWeek(row);
  const today = todayIso();
  if (today < week.start_date || today > week.end_date) return null;
  return week;
}

// warning: legacy flexible filter with many optional branches; prefer listWeeksV2 for workflow reads
export async function listWeeks(
  db: Db,
  clientId: string,
  filter: { status?: WeekStatus; planId?: string } = {},
): Promise<Week[]> {
  const conditions = [eq(weeks.client_id, clientId)];
  if (filter.status) conditions.push(eq(weeks.status, filter.status));
  if (filter.planId) conditions.push(eq(weeks.plan_id, filter.planId));
  const rows = await db
    .select()
    .from(weeks)
    .where(and(...conditions))
    .orderBy(desc(weeks.start_date));
  return rows.map(toWeek);
}

export async function listWeeksV2(
  db: Db,
  clientId: string,
  planId: string,
): Promise<Week[]> {
  const rows = await db
    .select()
    .from(weeks)
    .where(
      and(
        eq(weeks.client_id, clientId),
        eq(weeks.plan_id, planId),
        eq(weeks.status, "completed"),
      ),
    )
    .orderBy(desc(weeks.start_date));
  return rows.map(toWeek);
}

export async function getWeek(
  db: Db,
  clientId: string,
  weekId: string,
): Promise<Week> {
  const rows = await db
    .select()
    .from(weeks)
    .where(and(eq(weeks.id, weekId), eq(weeks.client_id, clientId)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new RepoError(
      "not_found",
      "week_not_found",
      `week ${weekId} not found`,
    );
  }
  return toWeek(row);
}

export async function completeWeek(db: Db, clientId: string): Promise<Week> {
  // find the in_flight week for the client
  const inFlightWeek = await db
    .select()
    .from(weeks)
    .where(and(eq(weeks.client_id, clientId), eq(weeks.status, "in_flight")))
    .limit(1);
  // if no in_flight week is found, throw an error
  if (!inFlightWeek[0]) {
    throw new RepoError(
      "not_found",
      "week_not_found",
      `week not found for client ${clientId}`,
    );
  }
  // found, update to completed
  const completedWeek = await db
    .update(weeks)
    .set({ status: "completed", updated_at: new Date().toISOString() })
    .where(and(eq(weeks.id, inFlightWeek[0].id), eq(weeks.status, "in_flight")))
    .returning();
  // if it doesnt return
  if (!completedWeek[0]) {
    throw new RepoError(
      "not_found",
      "week_not_found",
      `week ${inFlightWeek[0].id} not found`,
    );
  }

  return completedWeek[0];
}
/**
 * Patch one day of an in_flight week
 * See docs/architecture/api_contracts.md — UpdateDayLog rules.
 */
export async function updateDayLog(
  db: Db,
  clientId: string,
  weekId: string,
  dayIndex: number,
  input: UpdateDayLog,
): Promise<Week> {
  const week = await getWeek(db, clientId, weekId);

  if (week.status !== "in_flight") {
    throw new RepoError(
      "validation",
      "week_not_in_flight",
      "only an in_flight week can be changed; a completed week is immutable",
    );
  }
  const day = week.schedule.find((d) => d.day_index === dayIndex);
  if (!day) {
    throw new RepoError(
      "not_found",
      "day_not_found",
      `day ${dayIndex} is not scheduled in this week`,
    );
  }

  const scheduledKeys = day.exercises.map((e) => e.exercise_key);
  const inputKeys = input.exercises.map((e) => e.exercise_key);
  const missing = scheduledKeys.filter((k) => !inputKeys.includes(k));
  const unknown = inputKeys.filter((k) => !scheduledKeys.includes(k));
  if (missing.length > 0 || unknown.length > 0) {
    throw new RepoError(
      "validation",
      "exercise_log_mismatch",
      `logs must cover exactly the exercises scheduled on day ${dayIndex}` +
        ` (missing: ${missing.join(", ") || "none"}; unknown: ${unknown.join(", ") || "none"})`,
    );
  }

  const now = nowIso();
  const updatedDay: WeekDay = {
    ...day,
    completed: input.completed,
    completed_at: input.completed ? now : null,
    exercises: day.exercises.map((scheduled) => {
      const log = input.exercises.find(
        (e) => e.exercise_key === scheduled.exercise_key,
      );
      // Coverage was validated above, so this cannot be undefined.
      if (!log)
        throw new Error(
          "unreachable: exercise log missing after coverage validation",
        );
      return {
        ...scheduled,
        skipped: log.skipped,
        feedback: log.feedback,
        sets: log.sets,
      };
    }),
  };
  const schedule = week.schedule.map((d) =>
    d.day_index === dayIndex ? updatedDay : d,
  );

  const rows = await db
    .update(weeks)
    .set({ schedule, updated_at: now })
    .where(and(eq(weeks.id, weekId), eq(weeks.client_id, clientId)))
    .returning();
  const row = rows[0];
  if (!row) {
    throw new RepoError(
      "not_found",
      "week_not_found",
      `week ${weekId} not found`,
    );
  }
  return toWeek(row);
}

/**
 * Athlete Save day: persist exercise logs and always mark the day completed.
 * completed is owned by the server — never taken from the client body.
 */
export async function saveDay(
  db: Db,
  clientId: string,
  weekId: string,
  dayIndex: number,
  input: SaveDayLog,
): Promise<Week> {
  return updateDayLog(db, clientId, weekId, dayIndex, {
    completed: true,
    exercises: input.exercises,
  });
}

export async function saveNextWeek(
  db: Db,
  clientId: string,
  plan: Plan,
  previousWeek: Week,
  nextWeekSchedule: NextWeekSchedule,
): Promise<Week> {
  const now = nowIso();
  const startDate = addDays(previousWeek.end_date, 1);
  const row: Week = {
    id: crypto.randomUUID(),
    client_id: clientId,
    plan_id: plan.id,
    week_index: previousWeek.week_index + 1,
    start_date: startDate,
    end_date: addDays(startDate, 6),
    status: "in_flight" as const,
    schedule: nextWeekSchedule.schedule,
    created_at: now,
    updated_at: now,
  };
  await db.insert(weeks).values(row);
  return row;
}
