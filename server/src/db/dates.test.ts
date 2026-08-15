import { describe, expect, it } from 'vitest';

import { addDays } from './dates';

describe('addDays', () => {
  it('adds days within a week', () => {
    expect(addDays('2026-07-20', 6)).toBe('2026-07-26');
  });

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
