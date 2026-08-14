import { describe, expect, it } from 'vitest';

import { mapAnswersToProfileWrite } from './mapper.ts';
import type { OnboardingAnswers } from './schema.ts';

const beginnerAnswers: OnboardingAnswers = {
  sex: 'female',
  age: 34,
  height_cm: 165,
  weight_kg: 62,
  goal: 'build_muscle',
  days_per_week: 4,
};

describe('mapAnswersToProfileWrite', () => {
  it('places each answer in the column the model reads it from', () => {
    const write = mapAnswersToProfileWrite({
      ...beginnerAnswers,
      body_fat_percent: 22,
      target_date: '2026-12-01',
      target_weight_kg: 58,
      note: 'wedding in December',
    });

    expect(write.sex).toBe('female');
    expect(write.age).toBe(34);
    expect(write.height_cm).toBe(165);
    expect(write.body_composition).toEqual({ weight_kg: 62, body_fat_percent: 22 });
    expect(write.goals).toEqual({
      goal: 'build_muscle',
      target_date: '2026-12-01',
      target_weight_kg: 58,
      note: 'wedding in December',
    });
    expect(write.schedule_preferences).toEqual({ days_per_week: 4 });
  });

  it('invents no strength loads: this slice collects none yet', () => {
    const write = mapAnswersToProfileWrite(beginnerAnswers);

    expect(write.strength_loads).toEqual({});
  });

  it('skipped optional answers do not appear in the stored profile', () => {
    const write = mapAnswersToProfileWrite(beginnerAnswers);

    expect(write.goals).toEqual({ goal: 'build_muscle' });
    expect(write.body_composition).toEqual({ weight_kg: 62 });
    expect(write.nutrition).toBeNull();
    expect(write.activities).toBeNull();
    expect(write.notes).toBeNull();
  });
});
