import { describe, expect, it } from 'vitest';

import { feetInchesToInches, formatWeight } from './units';

describe('formatWeight', () => {
  it('labels a load in pounds', () => {
    expect(formatWeight(135)).toBe('135 lb');
    expect(formatWeight(0)).toBe('0 lb');
  });
});

describe('feetInchesToInches', () => {
  it('composes feet and inches exactly', () => {
    expect(feetInchesToInches(5, 10)).toBe(70);
    expect(feetInchesToInches(6, 0)).toBe(72);
    expect(feetInchesToInches(4, 11)).toBe(59);
  });
});
