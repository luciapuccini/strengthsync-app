import { describe, expect, it } from 'vitest';

import {
  cmToInches,
  feetInchesToInches,
  formatWeight,
  inchesToFeetInches,
  toCanonicalWeight,
  toDisplayWeight,
  unitLabel,
} from './units';

describe('toDisplayWeight', () => {
  it('passes pounds through untouched for an imperial athlete', () => {
    expect(toDisplayWeight(135, 'imperial')).toBe(135);
    expect(toDisplayWeight(0, 'imperial')).toBe(0);
  });

  it('rounds to the nearest whole kilogram', () => {
    expect(toDisplayWeight(135, 'metric')).toBe(61);
    expect(toDisplayWeight(140, 'metric')).toBe(64);
    expect(toDisplayWeight(0, 'metric')).toBe(0);
  });

  it('never collapses two adjacent grid loads onto one kilogram', () => {
    const steps = [135, 140, 145, 150, 155];
    const kilos = steps.map((pounds) => toDisplayWeight(pounds, 'metric'));
    expect(new Set(kilos).size).toBe(steps.length);
  });
});

describe('toCanonicalWeight', () => {
  it('leaves an imperial entry alone', () => {
    expect(toCanonicalWeight(220, 'imperial')).toBe(220);
  });

  it('round-trips 100 kg through pounds and back', () => {
    const pounds = toCanonicalWeight(100, 'metric');
    expect(pounds).toBe(220);
    expect(toDisplayWeight(pounds, 'metric')).toBe(100);
  });
});

describe('cmToInches', () => {
  it('converts to one decimal', () => {
    expect(cmToInches(178)).toBe(70.1);
    expect(cmToInches(177)).toBe(69.7);
  });
});

describe('unitLabel', () => {
  it('names each system', () => {
    expect(unitLabel('imperial')).toBe('lb');
    expect(unitLabel('metric')).toBe('kg');
  });
});

describe('formatWeight', () => {
  it('labels a load in pounds', () => {
    expect(formatWeight(135, 'imperial')).toBe('135 lb');
    expect(formatWeight(0, 'imperial')).toBe('0 lb');
  });

  it('converts and labels a load in kilograms', () => {
    expect(formatWeight(135, 'metric')).toBe('61 kg');
    expect(formatWeight(140, 'metric')).toBe('64 kg');
  });
});

describe('feetInchesToInches', () => {
  it('composes feet and inches exactly', () => {
    expect(feetInchesToInches(5, 10)).toBe(70);
    expect(feetInchesToInches(6, 0)).toBe(72);
    expect(feetInchesToInches(4, 11)).toBe(59);
  });
});

describe('inchesToFeetInches', () => {
  it('splits total inches back into the pair the form asks for', () => {
    expect(inchesToFeetInches(70)).toEqual({ feet: 5, inches: 10 });
    expect(inchesToFeetInches(72)).toEqual({ feet: 6, inches: 0 });
    expect(inchesToFeetInches(70.1)).toEqual({ feet: 5, inches: 10 });
  });
});
