import { and, eq } from 'drizzle-orm';

import type { Plan, PlanDay, Week, WeekDay } from '../../domain/model/index.ts';

import { dateForDayIndex } from '../dates.ts';
import type { Db } from '../db.ts';
import { RepoError } from '../errors.ts';
import { plans, weeks } from '../schema.ts';
import { toPlan } from './plans.ts';
import { toWeek } from './weeks.ts';

/** Idempotency lookup: return the already-activated plan + week 1 for a retried workflow. */
export async function findExistingActivation(
  db: Db,
  clientId: string,
  workflowId: string,
): Promise<{ plan: Plan; first_week: Week } | null> {
  const planRows = await db
    .select()
    .from(plans)
    .where(and(eq(plans.client_id, clientId), eq(plans.workflow_id, workflowId)))
    .limit(1);
  const planRow = planRows[0];
  if (!planRow) return null;
  const weekRows = await db
    .select()
    .from(weeks)
    .where(and(eq(weeks.plan_id, planRow.id), eq(weeks.week_index, 1)))
    .limit(1);
  const weekRow = weekRows[0];
  if (!weekRow) {
    throw new RepoError(
      'conflict',
      'activation_incomplete',
      'a plan with this workflow_id exists but its week 1 is missing',
    );
  }
  return { plan: toPlan(planRow), first_week: toWeek(weekRow) };
}

/** Expand a plan's canonical week template into week 1's dated, empty-log schedule. */
export function buildScheduleFromTemplate(weekTemplate: PlanDay[], start: string): WeekDay[] {
  return weekTemplate
    .map((day) => ({
      ...day,
      date: dateForDayIndex(start, day.day_index),
      completed: false,
      completed_at: null,
      exercises: day.exercises.map((exercise) => ({
        exercise_key: exercise.exercise_key,
        name: exercise.name,
        skipped: false,
        feedback: null,
        prescribed: {
          series: exercise.series,
          reps: exercise.reps,
          rest_time_sec: exercise.rest_time_sec,
          weight_kg: exercise.weight_kg,
          notes: exercise.notes,
        },
        sets: [],
      })),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
