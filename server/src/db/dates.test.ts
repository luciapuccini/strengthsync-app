import { describe, expect, it } from 'vitest';

import { addDays, dateForDayIndex, isoWeekday } from './dates';

describe('addDays', () => {
  it('adds days within a week', () => {
    expect(addDays('2026-07-20', 6)).toBe('2026-07-26');
  });

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('isoWeekday', () => {
  // 2026-07-20 is a Monday through 2026-07-26 a Sunday.
  it.each([
    ['2026-07-20', 1], // Monday
    ['2026-07-21', 2], // Tuesday
    ['2026-07-22', 3], // Wednesday
    ['2026-07-23', 4], // Thursday
    ['2026-07-24', 5], // Friday
    ['2026-07-25', 6], // Saturday
    ['2026-07-26', 7], // Sunday — the JS Date.getUTCDay() 0 wraps to 7, not 0.
  ])('maps %s to ISO weekday %i', (date, expected) => {
    expect(isoWeekday(date)).toBe(expected);
  });
});

describe('dateForDayIndex', () => {
  it('reduces to day_index - 1 for a Monday start', () => {
    const monday = '2026-07-20';
    for (let dayIndex = 1; dayIndex <= 7; dayIndex++) {
      expect(dateForDayIndex(monday, dayIndex)).toBe(addDays(monday, dayIndex - 1));
    }
  });

  it('rotates the window forward for a mid-week start', () => {
    const wednesday = '2026-07-22';
    expect(dateForDayIndex(wednesday, 3)).toBe('2026-07-22'); // same day
    expect(dateForDayIndex(wednesday, 7)).toBe('2026-07-26'); // this coming Sunday
    expect(dateForDayIndex(wednesday, 1)).toBe('2026-07-27'); // next Monday, not last
  });
});
