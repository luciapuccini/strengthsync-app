import { describe, expect, it } from 'vitest';

import { OnboardingAnswersSchema } from './schema.ts';

/**
 * `weight_lb` is an overloaded name: a load on a planned exercise, a body
 * measurement here. Only loads sit on the five-pound grid, and these cases pin
 * that distinction — the two meanings appear in the same payload.
 */
describe('OnboardingAnswersSchema', () => {
  const answers = {
    sex: 'female',
    age: 34,
    height_in: 65,
    weight_lb: 137,
    goal: 'build_muscle',
    target_weight_lb: 128,
    experience: 'advanced',
    squat_lb: 137,
    days_per_week: 4,
    rest_day: 7,
  };

  it('snaps a typed benchmark to the nearest five and leaves body and target weight alone', () => {
    const parsed = OnboardingAnswersSchema.parse(answers);

    expect(parsed.squat_lb).toBe(135);
    expect(parsed.weight_lb).toBe(137);
    expect(parsed.target_weight_lb).toBe(128);
  });

  it('leaves an already-gridded benchmark untouched', () => {
    expect(OnboardingAnswersSchema.parse({ ...answers, deadlift_lb: 315 }).deadlift_lb).toBe(315);
  });

  it('leaves an omitted benchmark omitted', () => {
    expect(OnboardingAnswersSchema.parse(answers).bench_press_lb).toBeUndefined();
  });
});
