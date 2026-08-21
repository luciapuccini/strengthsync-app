import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import type { PlanDay } from '../../domain/model/index.ts';

import { addDays, todayIso } from '../dates';
import type { Db } from '../db';
import { RepoError } from '../errors';
import { weeks } from '../schema';
import { createClient, getClient } from '../repositories/clients';
import { activateGeneratedPlan, getActivePlan, listPlans } from '../repositories/plans';
import { upsertProfile } from '../repositories/profiles';
import {
  completeWeek,
  getCurrentWeek,
  listWeeks,
  saveDay,
  saveNextWeek,
  updateDayLog,
} from '../repositories/weeks';
import { createTestDb, markAllDaysCompleted } from '../testing/index';

const weekTemplate: PlanDay[] = [
  {
    day_index: 1,
    type: 'upper_body',
    notes: null,
    exercises: [
      {
        exercise_key: 'press_banca',
        name: 'Bench press',
        series: 4,
        reps: 8,
        rest_time_sec: 120,
        weight_lb: 60,
        notes: null,
      },
    ],
  },
  { day_index: 3, type: 'rest', notes: null, exercises: [] },
];

const profileInput = {
  snapshot_date: '2026-07-01',
  sex: 'female',
  age: 34,
  height_in: 65,
  goals: { primary: 'strength' },
  body_composition: { weight_lb: 62 },
  strength_loads: { press_banca_lb: 135 },
  nutrition: { calories: 2100 },
  activities: null,
  schedule_preferences: { days_per_week: 4 },
  notes: null,
};

let db: Db;
let clientId: string;

beforeEach(async () => {
  db = createTestDb();
  const client = await createClient(db, { display_name: 'Ana' });
  clientId = client.id;
});

describe('clients', () => {
  it('creates a client under the seeded coach', async () => {
    expect(await getClient(db, clientId)).toMatchObject({
      coach_id: '00000000-0000-4000-8000-000000000001',
      display_name: 'Ana',
      status: 'active',
    });
  });
});

describe('profiles', () => {
  it('inserts then updates one profile per client', async () => {
    const created = await upsertProfile(db, clientId, profileInput);
    expect(created.client_id).toBe(clientId);
    expect(created.goals).toEqual({ primary: 'strength' });

    const updated = await upsertProfile(db, clientId, {
      ...profileInput,
      age: 35,
      notes: 'updated',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.age).toBe(35);
    expect(updated.notes).toBe('updated');
    expect(updated.strength_loads).toEqual({ press_banca_lb: 135 });
  });
});

describe('plan + week lifecycle', () => {
  async function activate(workflowId = 'wf-activate-1') {
    return activateGeneratedPlan(db, clientId, {
      workflow_id: workflowId,
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    });
  }

  it('activates a plan and creates week 1 from the template', async () => {
    const { plan, first_week } = await activate();

    expect(plan.status).toBe('active');
    expect(plan.activated_at).not.toBeNull();
    expect(first_week.week_index).toBe(1);
    expect(first_week.status).toBe('in_flight');
    expect(first_week.start_date <= first_week.end_date).toBe(true);
    expect(first_week.schedule).toHaveLength(2);
    expect(first_week.schedule[0]?.date).toBe(first_week.start_date);
    expect(first_week.schedule[0]?.exercises[0]).toMatchObject({
      exercise_key: 'press_banca',
      skipped: false,
      feedback: null,
      sets: [],
      prescribed: { series: 4, reps: 8, weight_lb: 60 },
    });
    expect(await getCurrentWeek(db, clientId)).toMatchObject({ id: first_week.id });
    expect(await getActivePlan(db, clientId)).toMatchObject({ id: plan.id });
  });

  it('is idempotent by workflow_id', async () => {
    const first = await activate('wf-activate-idem');
    const second = await activate('wf-activate-idem');

    expect(second.plan.id).toBe(first.plan.id);
    expect(second.first_week.id).toBe(first.first_week.id);
    expect(await listPlans(db, clientId)).toHaveLength(1);
    expect(await listWeeks(db, clientId)).toHaveLength(1);
  });

  it('activating a new plan archives the previous one once its weeks are completed', async () => {
    const first = await activate('wf-activate-a');
    await markAllDaysCompleted(db, clientId, first.first_week.id);
    await completeWeek(db, clientId);
    const activePlan = (await getActivePlan(db, clientId))!;
    const week2 = await saveNextWeek(db, clientId, activePlan, first.first_week, {
      schedule: first.first_week.schedule,
    });
    await markAllDaysCompleted(db, clientId, week2.id);
    await completeWeek(db, clientId);

    const second = await activateGeneratedPlan(db, clientId, {
      workflow_id: 'wf-activate-b',
      plan: {
        label: 'Block 2',
        total_weeks: 4,
        week_template: weekTemplate,
        rationale: 'more volume',
      },
    });

    const plans = await listPlans(db, clientId);
    expect(plans).toHaveLength(2);
    expect(plans.find((p) => p.id === first.plan.id)?.status).toBe('archived');
    expect(second.plan.status).toBe('active');
    expect(second.plan.rationale).toBe('more volume');
    // History is retained: every old week stays queryable.
    expect(await listWeeks(db, clientId, { status: 'completed' })).toHaveLength(2);
  });

  it('rolls back the whole activation batch when week 1 violates the in_flight invariant', async () => {
    await activate('wf-activate-first');

    // A second activation while a week is still in_flight must fail atomically:
    // no new plan row, and the original active plan untouched.
    await expect(activate('wf-activate-second')).rejects.toThrow();
    const plans = await listPlans(db, clientId);
    expect(plans).toHaveLength(1);
    expect(plans[0]?.status).toBe('active');
  });
});

describe('getCurrentWeek', () => {
  async function activate() {
    return activateGeneratedPlan(db, clientId, {
      workflow_id: 'wf-activate-current',
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    });
  }

  it('returns null when the in_flight week has not started yet', async () => {
    const { first_week } = await activate();
    const futureStart = addDays(todayIso(), 7);
    await db
      .update(weeks)
      .set({ start_date: futureStart, end_date: addDays(futureStart, 6) })
      .where(eq(weeks.id, first_week.id));

    expect(await getCurrentWeek(db, clientId)).toBeNull();
  });

  it('returns null when the in_flight week is in the past', async () => {
    const { first_week } = await activate();
    const pastEnd = addDays(todayIso(), -1);
    await db
      .update(weeks)
      .set({ start_date: addDays(pastEnd, -6), end_date: pastEnd })
      .where(eq(weeks.id, first_week.id));

    expect(await getCurrentWeek(db, clientId)).toBeNull();
  });
});

describe('day logs', () => {
  it('patches one day and marks it completed', async () => {
    const { first_week } = await activateGeneratedPlan(db, clientId, {
      workflow_id: 'wf-activate-1',
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    });

    const updated = await updateDayLog(db, clientId, first_week.id, 1, {
      completed: true,
      exercises: [
        {
          exercise_key: 'press_banca',
          skipped: false,
          feedback: 'hard',
          sets: [
            { performed_reps: 8, performed_weight_lb: 60 },
            { performed_reps: 8, performed_weight_lb: 60 },
            { performed_reps: 7, performed_weight_lb: 60 },
            { performed_reps: 7, performed_weight_lb: 60 },
          ],
        },
      ],
    });

    const day = updated.schedule.find((d) => d.day_index === 1);
    expect(day?.completed).toBe(true);
    expect(day?.completed_at).not.toBeNull();
    expect(day?.exercises[0]?.feedback).toBe('hard');
    expect(day?.exercises[0]?.sets).toHaveLength(4);
    // The untouched day keeps its original state.
    expect(updated.schedule.find((d) => d.day_index === 3)?.completed).toBe(false);
  });

  it('rejects logs that do not cover exactly the scheduled exercises', async () => {
    const { first_week } = await activateGeneratedPlan(db, clientId, {
      workflow_id: 'wf-activate-1',
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    });

    await expect(
      updateDayLog(db, clientId, first_week.id, 1, { completed: false, exercises: [] }),
    ).rejects.toThrow(RepoError);
    await expect(
      updateDayLog(db, clientId, first_week.id, 1, {
        completed: false,
        exercises: [
          { exercise_key: 'press_banca', skipped: true, feedback: null, sets: [] },
          { exercise_key: 'unknown_key', skipped: true, feedback: null, sets: [] },
        ],
      }),
    ).rejects.toThrow(/unknown/);
  });

  it('rejects changes to a completed week', async () => {
    const { first_week } = await activateGeneratedPlan(db, clientId, {
      workflow_id: 'wf-activate-1',
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    });
    await markAllDaysCompleted(db, clientId, first_week.id);
    await completeWeek(db, clientId);

    await expect(
      updateDayLog(db, clientId, first_week.id, 1, {
        completed: false,
        exercises: [{ exercise_key: 'press_banca', skipped: true, feedback: null, sets: [] }],
      }),
    ).rejects.toThrow(/in_flight/);
  });
});

describe('saveDay', () => {
  it('always marks the day completed and persists exercise logs', async () => {
    const { first_week } = await activateGeneratedPlan(db, clientId, {
      workflow_id: 'wf-activate-1',
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    });

    const updated = await saveDay(db, clientId, first_week.id, 1, {
      exercises: [
        {
          exercise_key: 'press_banca',
          skipped: false,
          feedback: 'hard',
          sets: [
            { performed_reps: 8, performed_weight_lb: 60 },
            { performed_reps: 8, performed_weight_lb: 60 },
            { performed_reps: 7, performed_weight_lb: 60 },
            { performed_reps: 7, performed_weight_lb: 60 },
          ],
        },
      ],
    });

    const day = updated.schedule.find((d) => d.day_index === 1);
    expect(day?.completed).toBe(true);
    expect(day?.completed_at).not.toBeNull();
    expect(day?.exercises[0]?.feedback).toBe('hard');
    expect(day?.exercises[0]?.sets).toHaveLength(4);
  });

  it('marks an empty rest day completed', async () => {
    const { first_week } = await activateGeneratedPlan(db, clientId, {
      workflow_id: 'wf-activate-1',
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    });

    const updated = await saveDay(db, clientId, first_week.id, 3, { exercises: [] });
    const day = updated.schedule.find((d) => d.day_index === 3);
    expect(day?.completed).toBe(true);
    expect(day?.completed_at).not.toBeNull();
  });
});
