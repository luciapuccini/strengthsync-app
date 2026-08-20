import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanDay } from '../../domain/model/index.ts';

import { isoWeekday } from '../dates.ts';
import type { Db } from '../db';
import { createClient } from '../repositories/clients';
import { activateGeneratedPlan } from '../repositories/plans';
import { completeWeek, saveNextWeek } from '../repositories/weeks';
import { createTestDb, markAllDaysCompleted } from '../testing/index';

// Only the day shape matters here; exercise expansion is covered in
// repositories.test.ts.
const weekTemplate: PlanDay[] = [
  { day_index: 1, type: 'upper_body', notes: null, exercises: [] },
  { day_index: 3, type: 'rest', notes: null, exercises: [] },
];

let db: Db;
let clientId: string;

beforeEach(async () => {
  db = createTestDb();
  const client = await createClient(db, { display_name: 'Ana' });
  clientId = client.id;
});

describe('first week anchoring', () => {
  // A Wednesday. The clock is frozen because the behaviour under test only
  // differs from the old Monday-anchored one on six days in seven — a test left
  // on the real clock would assert nothing every Monday.
  const wednesday = '2026-07-22';

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${wednesday}T09:00:00.000Z`));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function activate(workflowId: string) {
    return activateGeneratedPlan(db, clientId, {
      workflow_id: workflowId,
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    });
  }

  it('starts week 1 on the activation day, not the Monday of its ISO week', async () => {
    const { first_week } = await activate('wf-anchor-midweek');

    expect(first_week.start_date).toBe(wednesday);
    expect(first_week.end_date).toBe('2026-07-28');
    // day_index 3 (Wednesday) lands on the activation day itself; day_index 1
    // (Monday) is the coming Monday, not the one that already passed — so no
    // day of week 1 is in the past, and every day lands on its own ISO weekday.
    expect(first_week.schedule.map((d) => d.date)).toEqual(['2026-07-22', '2026-07-27']);
    for (const day of first_week.schedule) {
      expect(isoWeekday(day.date)).toBe(day.day_index);
    }
    expect(first_week.schedule.every((d) => d.date >= wednesday)).toBe(true);
  });

  it('starts week 2 the day after week 1 ends, for a non-Monday start, and rotates the same way', async () => {
    const { plan, first_week } = await activate('wf-anchor-chain');
    await markAllDaysCompleted(db, clientId, first_week.id);
    await completeWeek(db, clientId);

    const week2 = await saveNextWeek(db, clientId, plan, first_week, {
      schedule: first_week.schedule.map(({ date: _date, ...day }) => day),
    });

    expect(week2.start_date).toBe('2026-07-29');
    expect(week2.end_date).toBe('2026-08-04');
    expect(week2.schedule.map((d) => d.date)).toEqual(['2026-07-29', '2026-08-03']);
    for (const day of week2.schedule) {
      expect(isoWeekday(day.date)).toBe(day.day_index);
    }
  });
});

describe('rest day placement', () => {
  // A Wednesday activation, same as `first week anchoring` above.
  const wednesday = '2026-07-22';

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${wednesday}T09:00:00.000Z`));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('an athlete whose rest_day is 7 gets the rest day scheduled on a Sunday', async () => {
    // Simulates what buildFirstPlanPrompt asks the model to produce for an
    // athlete whose onboarding rest_day is 7 (Sunday): the day_index 7 slot
    // carries type "rest".
    const restDayTemplate: PlanDay[] = [
      { day_index: 1, type: 'upper_body', notes: null, exercises: [] },
      { day_index: 7, type: 'rest', notes: null, exercises: [] },
    ];

    const { first_week } = await activateGeneratedPlan(db, clientId, {
      workflow_id: 'wf-rest-day-sunday',
      plan: { label: 'Block 1', total_weeks: 2, week_template: restDayTemplate, rationale: null },
    });

    const restDay = first_week.schedule.find((d) => d.type === 'rest');
    expect(restDay).toBeDefined();
    expect(restDay?.day_index).toBe(7);
    expect(isoWeekday(restDay!.date)).toBe(7);
  });
});
