import { describe, expect, it } from 'vitest';

import type { Week } from '@/api/types';

import { makeWeek } from '@/test/weekFixture';

import { weekSummary } from './weekSummary';

function sevenDayWeek(completedDayIndexes: number[]): Week {
  const base = makeWeek();
  const training = base.schedule[0]!;
  const rest = base.schedule[1]!;
  const types = [training, training, rest, training, training, rest, training];
  return {
    ...base,
    schedule: types.map((day, i) => ({
      ...day,
      day_index: i + 1,
      completed: completedDayIndexes.includes(i + 1),
    })),
  };
}

describe('weekSummary', () => {
  it('excludes rest days from both sides of the ratio', () => {
    const summary = weekSummary(sevenDayWeek([3, 6]));
    expect(summary.plannedDays).toBe(5);
    expect(summary.recordedDays).toBe(0);
  });

  it('counts a training day as recorded only when it carries the completion flag', () => {
    const summary = weekSummary(sevenDayWeek([1, 4]));
    expect(summary.plannedDays).toBe(5);
    expect(summary.recordedDays).toBe(2);
  });

  it('names the weekday of the end date in a pinned locale', () => {
    expect(weekSummary({ ...makeWeek(), end_date: '2026-07-26' }).endWeekday).toBe('Sunday');
  });
});
