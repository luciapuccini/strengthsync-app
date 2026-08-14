import { describe, expect, it } from 'vitest';

import { mapAnswersToProfileWrite } from './mapper.ts';
import type { OnboardingAnswers } from './schema.ts';

const beginnerAnswers: OnboardingAnswers = {
  sex: 'female',
  age: 34,
  height_cm: 165,
  weight_kg: 62,
  goal: 'build_muscle',
  experience: 'beginner',
  days_per_week: 4,
  rest_day: 7,
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
    expect(write.schedule_preferences).toEqual({ days_per_week: 4, rest_day: 7 });
  });

  it('a beginner invents no strength loads: experience is stored, lifts stay empty', () => {
    const write = mapAnswersToProfileWrite(beginnerAnswers);

    expect(write.strength_loads).toEqual({ experience: 'beginner', lifts: {} });
  });

  it('an experienced client keeps only the lifts they gave a weight for', () => {
    const write = mapAnswersToProfileWrite({
      ...beginnerAnswers,
      experience: 'advanced',
      squat_kg: 100,
      deadlift_kg: 140,
      // bench_press_kg and overhead_press_kg skipped: those lifts are not trained.
    });

    expect(write.strength_loads).toEqual({
      experience: 'advanced',
      lifts: { squat: 100, deadlift: 140 },
    });
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
