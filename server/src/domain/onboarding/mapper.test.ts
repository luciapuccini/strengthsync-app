import { describe, expect, it } from 'vitest';

import { mapAnswersToProfileWrite } from './mapper.ts';
import type { OnboardingAnswers } from './schema.ts';

const beginnerAnswers: OnboardingAnswers = {
  sex: 'female',
  age: 34,
  height_in: 65,
  weight_lb: 137,
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
      target_weight_lb: 128,
      note: 'wedding in December',
    });

    expect(write.sex).toBe('female');
    expect(write.age).toBe(34);
    expect(write.height_in).toBe(65);
    expect(write.body_composition).toEqual({ weight_lb: 137, body_fat_percent: 22 });
    expect(write.goals).toEqual({
      goal: 'build_muscle',
      target_date: '2026-12-01',
      target_weight_lb: 128,
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
      squat_lb: 225,
      deadlift_lb: 315,
      // bench_press_lb and overhead_press_lb skipped: those lifts are not trained.
    });

    expect(write.strength_loads).toEqual({
      experience: 'advanced',
      lifts: { squat_lb: 225, deadlift_lb: 315 },
    });
  });

  it('skipped optional answers do not appear in the stored profile', () => {
    const write = mapAnswersToProfileWrite(beginnerAnswers);

    expect(write.goals).toEqual({ goal: 'build_muscle' });
    expect(write.body_composition).toEqual({ weight_lb: 137 });
    expect(write.nutrition).toBeNull();
    expect(write.activities).toBeNull();
    expect(write.notes).toBeNull();
    expect(write.schedule_preferences).toEqual({ days_per_week: 4, rest_day: 7 });
  });
});

describe('mapAnswersToProfileWrite: life step', () => {
  it('places declared activities in the activities column as items', () => {
    const write = mapAnswersToProfileWrite({
      ...beginnerAnswers,
      activities: [
        { name: 'swimming', sessions_per_week: 2, note: 'pyramid and endurance sets' },
        { name: 'pilates', sessions_per_week: 1 },
      ],
    });

    expect(write.activities).toEqual({
      items: [
        { name: 'swimming', sessions_per_week: 2, note: 'pyramid and endurance sets' },
        { name: 'pilates', sessions_per_week: 1 },
      ],
    });
  });

  it('an empty activities list maps to no activities, not an empty items array', () => {
    const write = mapAnswersToProfileWrite({ ...beginnerAnswers, activities: [] });

    expect(write.activities).toBeNull();
  });

  it('places daily activity level with the schedule preferences', () => {
    const write = mapAnswersToProfileWrite({
      ...beginnerAnswers,
      daily_activity_level: 'sedentary',
    });

    expect(write.schedule_preferences).toEqual({
      days_per_week: 4,
      rest_day: 7,
      daily_activity_level: 'sedentary',
    });
  });

  it('places eating phase and protein target with nutrition', () => {
    const write = mapAnswersToProfileWrite({
      ...beginnerAnswers,
      eating_phase: 'deficit',
      protein_target_g: 130,
    });

    expect(write.nutrition).toEqual({ eating_phase: 'deficit', protein_target_g: 130 });
  });

  it('a protein target given without an eating phase is still stored', () => {
    const write = mapAnswersToProfileWrite({ ...beginnerAnswers, protein_target_g: 130 });

    expect(write.nutrition).toEqual({ protein_target_g: 130 });
  });

  it('places the injury free text in the profile notes', () => {
    const write = mapAnswersToProfileWrite({
      ...beginnerAnswers,
      injury_note: 'left knee, avoid deep squats',
    });

    expect(write.notes).toBe('left knee, avoid deep squats');
  });
});
