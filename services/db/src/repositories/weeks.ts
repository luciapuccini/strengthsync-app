import { and, desc, eq } from 'drizzle-orm'

import type { SaveDayLog, UpdateDayLog } from '@strengthsync/domain/contracts'
import type { Week, WeekDay, WeekStatus } from '@strengthsync/domain/model'

import { nowIso, todayIso } from '../dates.ts'
import type { Db } from '../db.ts'
import { RepoError } from '../errors.ts'
import { weeks } from '../schema.ts'

/** Strip persistence-only columns (workflow_id) from a week row. */
export function toWeek(row: typeof weeks.$inferSelect): Week {
  const { workflow_id: _workflowId, ...week } = row
  return week
}

export async function getCurrentWeek(db: Db, clientId: string): Promise<Week | null> {
  const rows = await db
    .select()
    .from(weeks)
    .where(and(eq(weeks.client_id, clientId), eq(weeks.status, 'in_flight')))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  const week = toWeek(row)
  const today = todayIso()
  if (today < week.start_date || today > week.end_date) return null
  return week
}

export async function listWeeks(
  db: Db,
  clientId: string,
  filter: { status?: WeekStatus; planId?: string } = {},
): Promise<Week[]> {
  const conditions = [eq(weeks.client_id, clientId)]
  if (filter.status) conditions.push(eq(weeks.status, filter.status))
  if (filter.planId) conditions.push(eq(weeks.plan_id, filter.planId))
  const rows = await db
    .select()
    .from(weeks)
    .where(and(...conditions))
    .orderBy(desc(weeks.start_date))
  return rows.map(toWeek)
}

export async function getWeek(db: Db, clientId: string, weekId: string): Promise<Week | null> {
  const rows = await db
    .select()
    .from(weeks)
    .where(and(eq(weeks.id, weekId), eq(weeks.client_id, clientId)))
    .limit(1)
  const row = rows[0]
  return row ? toWeek(row) : null
}

/**
 * Patch one day of an in_flight week. The UI updates one day at a time and
 * must supply logs for every exercise scheduled that day, so stale browser
 * state cannot silently overwrite other days or exercises.
 * See docs/architecture/api_contracts.md — UpdateDayLog rules.
 */
export async function updateDayLog(
  db: Db,
  clientId: string,
  weekId: string,
  dayIndex: number,
  input: UpdateDayLog,
): Promise<Week> {
  const week = await getWeek(db, clientId, weekId)
  if (!week) {
    throw new RepoError('not_found', 'week_not_found', `week ${weekId} not found`)
  }
  if (week.status !== 'in_flight') {
    throw new RepoError(
      'validation',
      'week_not_in_flight',
      'only an in_flight week can be changed; a completed week is immutable',
    )
  }
  const day = week.schedule.find((d) => d.day_index === dayIndex)
  if (!day) {
    throw new RepoError('not_found', 'day_not_found', `day ${dayIndex} is not scheduled in this week`)
  }

  const scheduledKeys = day.exercises.map((e) => e.exercise_key)
  const inputKeys = input.exercises.map((e) => e.exercise_key)
  const missing = scheduledKeys.filter((k) => !inputKeys.includes(k))
  const unknown = inputKeys.filter((k) => !scheduledKeys.includes(k))
  if (missing.length > 0 || unknown.length > 0) {
    throw new RepoError(
      'validation',
      'exercise_log_mismatch',
      `logs must cover exactly the exercises scheduled on day ${dayIndex}` +
        ` (missing: ${missing.join(', ') || 'none'}; unknown: ${unknown.join(', ') || 'none'})`,
    )
  }

  const now = nowIso()
  const updatedDay: WeekDay = {
    ...day,
    completed: input.completed,
    completed_at: input.completed ? now : null,
    exercises: day.exercises.map((scheduled) => {
      const log = input.exercises.find((e) => e.exercise_key === scheduled.exercise_key)
      // Coverage was validated above, so this cannot be undefined.
      if (!log) throw new Error('unreachable: exercise log missing after coverage validation')
      return { ...scheduled, skipped: log.skipped, feedback: log.feedback, sets: log.sets }
    }),
  }
  const schedule = week.schedule.map((d) => (d.day_index === dayIndex ? updatedDay : d))

  const rows = await db
    .update(weeks)
    .set({ schedule, updated_at: now })
    .where(and(eq(weeks.id, weekId), eq(weeks.client_id, clientId)))
    .returning()
  const row = rows[0]
  if (!row) {
    throw new RepoError('not_found', 'week_not_found', `week ${weekId} not found`)
  }
  return toWeek(row)
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
  })
}
