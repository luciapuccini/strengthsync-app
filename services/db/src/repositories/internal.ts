import { and, asc, eq } from 'drizzle-orm'

import { COACHING_RULES } from '@strengthsync/domain/coach'
import type {
  ActivateGeneratedPlanCommand,
  CreateNextWeekCommand,
  PlanGenerationContext,
  WeeklyContext,
} from '@strengthsync/domain/contracts'
import type { Plan, Week } from '@strengthsync/domain/model'

import { addDays, nowIso, startOfISOWeek, todayIso } from '../dates.ts'
import type { Db } from '../db.ts'
import { RepoError } from '../errors.ts'
import { newId } from '../ids.ts'
import { plans, weeks } from '../schema.ts'
import { getClient } from './clients.ts'
import {
  buildScheduleFromTemplate,
  findExistingActivation,
  findWeekByWorkflowId,
} from './internal-helpers.ts'
import { toPlan } from './plans.ts'
import { getProfile } from './profiles.ts'
import { getWeek, toWeek } from './weeks.ts'

/**
 * Internal workflow-to-data commands. See docs/architecture/api_contracts.md.
 * Every write command carries `workflow_id`: a repeated Temporal activity
 * invocation returns the already-created product state instead of
 * duplicating a week or plan.
 */

async function requireClientAndProfile(db: Db, clientId: string) {
  const client = await getClient(db, clientId)
  if (!client) throw new RepoError('not_found', 'client_not_found', `client ${clientId} not found`)
  const profile = await getProfile(db, clientId)
  if (!profile) {
    throw new RepoError('not_found', 'profile_not_found', `client ${clientId} has no profile`)
  }
  return { client, profile }
}

async function findActivePlanRow(db: Db, clientId: string) {
  const activePlanRows = await db
    .select()
    .from(plans)
    .where(and(eq(plans.client_id, clientId), eq(plans.status, 'active')))
    .limit(1)
  return activePlanRows[0] ?? null
}

async function requireClientContext(db: Db, clientId: string) {
  const { client, profile } = await requireClientAndProfile(db, clientId)
  const activePlan = await findActivePlanRow(db, clientId)
  if (!activePlan) {
    throw new RepoError('not_found', 'active_plan_not_found', `client ${clientId} has no active plan`)
  }
  return { client, profile, activePlan }
}

export async function getWeeklyContext(
  db: Db,
  clientId: string,
  weekId: string,
): Promise<WeeklyContext> {
  const { client, profile, activePlan } = await requireClientContext(db, clientId)
  const week = await getWeek(db, clientId, weekId)
  if (!week) throw new RepoError('not_found', 'week_not_found', `week ${weekId} not found`)
  return {
    client,
    profile,
    active_plan: toPlan(activePlan),
    week,
    coaching_rules: COACHING_RULES,
  }
}

/**
 * Freeze a week's schedule/logs by marking it completed. Idempotent:
 * completing an already-completed week returns it unchanged.
 */
export async function completeWeek(db: Db, clientId: string, weekId: string): Promise<Week> {
  const week = await getWeek(db, clientId, weekId)
  if (!week) throw new RepoError('not_found', 'week_not_found', `week ${weekId} not found`)
  if (week.status === 'completed') return week
  if (week.status !== 'in_flight') {
    throw new RepoError(
      'validation',
      'week_not_in_flight',
      `week ${weekId} has status ${week.status}; only an in_flight week can be completed`,
    )
  }
  const currentRows = await db
    .select({ id: weeks.id })
    .from(weeks)
    .where(and(eq(weeks.client_id, clientId), eq(weeks.status, 'in_flight')))
    .limit(1)
  if (currentRows[0]?.id !== weekId) {
    throw new RepoError(
      'validation',
      'week_not_current',
      'referenced week is not the client’s current in_flight week',
    )
  }

  const now = nowIso()
  const rows = await db
    .update(weeks)
    .set({ status: 'completed', updated_at: now })
    .where(and(eq(weeks.id, weekId), eq(weeks.status, 'in_flight')))
    .returning()
  const row = rows[0]
  if (row) return toWeek(row)
  // Lost a race with a concurrent complete: return the already-completed week.
  const after = await getWeek(db, clientId, weekId)
  if (after?.status === 'completed') return after
  throw new RepoError('conflict', 'week_complete_conflict', `week ${weekId} could not be completed`)
}

/** Create the sole next in_flight week. Idempotent by `workflow_id`. */
export async function createNextWeek(db: Db, clientId: string, cmd: CreateNextWeekCommand): Promise<Week> {
  const existing = await findWeekByWorkflowId(db, clientId, cmd.workflow_id)
  if (existing) return existing

  const previous = await getWeek(db, clientId, cmd.previous_week_id)
  if (!previous) {
    throw new RepoError(
      'not_found',
      'previous_week_not_found',
      `week ${cmd.previous_week_id} not found`,
    )
  }
  if (previous.status !== 'completed') {
    throw new RepoError(
      'validation',
      'previous_week_not_completed',
      'the previous week must be completed before the next week is created',
    )
  }
  const planRows = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, previous.plan_id), eq(plans.client_id, clientId)))
    .limit(1)
  const plan = planRows[0]
  if (!plan) {
    throw new RepoError('not_found', 'plan_not_found', `plan ${previous.plan_id} not found`)
  }
  const weekIndex = previous.week_index + 1
  if (weekIndex > plan.total_weeks) {
    throw new RepoError(
      'validation',
      'plan_complete',
      `plan ${plan.id} has ${plan.total_weeks} weeks; no next week can be created`,
    )
  }

  const now = nowIso()
  const row = {
    id: newId(),
    client_id: clientId,
    plan_id: plan.id,
    week_index: weekIndex,
    start_date: addDays(previous.start_date, 7),
    end_date: addDays(previous.end_date, 7),
    status: 'in_flight' as const,
    schedule: cmd.schedule,
    workflow_id: cmd.workflow_id,
    created_at: now,
    updated_at: now,
  }
  try {
    await db.insert(weeks).values(row)
  } catch (err) {
    // Concurrent retry of the same workflow activity: return its week.
    const duplicate = await findWeekByWorkflowId(db, clientId, cmd.workflow_id)
    if (duplicate) return duplicate
    throw err
  }
  return toWeek(row)
}

/**
 * Load context for plan generation.
 * - Initial plan: no active plan → empty history.
 * - Replacement: active plan whose final week is completed and no in_flight week.
 * Rejects when an active plan still has weeks remaining or an in_flight week.
 */
export async function getPlanGenerationContext(
  db: Db,
  clientId: string,
): Promise<PlanGenerationContext> {
  const { client, profile } = await requireClientAndProfile(db, clientId)
  const activePlan = await findActivePlanRow(db, clientId)

  if (!activePlan) {
    return {
      client,
      profile,
      active_plan: null,
      completed_weeks: [],
      coaching_rules: COACHING_RULES,
    }
  }

  const inFlight = await db
    .select({ id: weeks.id })
    .from(weeks)
    .where(and(eq(weeks.client_id, clientId), eq(weeks.status, 'in_flight')))
    .limit(1)
  if (inFlight[0]) {
    throw new RepoError(
      'validation',
      'plan_not_complete',
      `client ${clientId} still has an in_flight week; finish the active plan before generating a replacement`,
    )
  }

  const completedWeeks = await db
    .select()
    .from(weeks)
    .where(
      and(eq(weeks.client_id, clientId), eq(weeks.plan_id, activePlan.id), eq(weeks.status, 'completed')),
    )
    .orderBy(asc(weeks.start_date))
  const finalWeek = completedWeeks.find((week) => week.week_index === activePlan.total_weeks)
  if (!finalWeek) {
    throw new RepoError(
      'validation',
      'plan_not_complete',
      `active plan ${activePlan.id} has not completed week ${activePlan.total_weeks}; replacement generation is not allowed yet`,
    )
  }

  return {
    client,
    profile,
    active_plan: toPlan(activePlan),
    completed_weeks: completedWeeks.map(toWeek),
    coaching_rules: COACHING_RULES,
  }
}

/**
 * Archive the prior active plan, create + activate the generated plan, and
 * create week 1 from its canonical template — atomically via D1 `batch()`
 * (D1 does not support standard transactions; see docs/architecture/stack.md).
 * Week 1 starts on the Monday of the activation week (Mon–Sun convention).
 * Idempotent by `workflow_id`.
 * warning: legacy version; prefer activateGeneratedPlanV2 in repositories/plans.ts.
 */
export async function activateGeneratedPlan(
  db: Db,
  clientId: string,
  cmd: ActivateGeneratedPlanCommand,
): Promise<{ plan: Plan; first_week: Week }> {
  const existing = await findExistingActivation(db, clientId, cmd.workflow_id)
  if (existing) return existing

  const now = nowIso()
  const start = startOfISOWeek(todayIso())
  const planRow = {
    id: newId(),
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
  }
  const weekRow = {
    id: newId(),
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
  }

  await db.batch([
    db
      .update(plans)
      .set({ status: 'archived', updated_at: now })
      .where(and(eq(plans.client_id, clientId), eq(plans.status, 'active'))),
    db.insert(plans).values(planRow),
    db.insert(weeks).values(weekRow),
  ])

  return { plan: toPlan(planRow), first_week: toWeek(weekRow) }
}
