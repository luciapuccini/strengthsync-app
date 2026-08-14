import type { ClientProfileWrite } from '../model/index.ts';

import type { OnboardingAnswers } from './schema.ts';

/**
 * Pure answers-to-profile mapping: the one place that knows which profile
 * column each onboarding answer belongs to. No I/O, no framework.
 *
 * `nutrition` and `activities` are placeholders here —
 * `issues/005-life-step.md` extends this mapper to fill them from the life
 * step. `snapshot_date` is the caller's to set: this function stays free of
 * the clock.
 */
export function mapAnswersToProfileWrite(
  answers: OnboardingAnswers,
): Omit<ClientProfileWrite, 'snapshot_date'> {
  return {
    sex: answers.sex,
    age: answers.age,
    height_cm: answers.height_cm,
    goals: {
      goal: answers.goal,
      ...(answers.target_date !== undefined ? { target_date: answers.target_date } : {}),
      ...(answers.target_weight_kg !== undefined
        ? { target_weight_kg: answers.target_weight_kg }
        : {}),
      ...(answers.note !== undefined ? { note: answers.note } : {}),
    },
    body_composition: {
      weight_kg: answers.weight_kg,
      ...(answers.body_fat_percent !== undefined
        ? { body_fat_percent: answers.body_fat_percent }
        : {}),
    },
    strength_loads: {
      experience: answers.experience,
      lifts: {
        ...(answers.squat_kg !== undefined ? { squat: answers.squat_kg } : {}),
        ...(answers.bench_press_kg !== undefined ? { bench_press: answers.bench_press_kg } : {}),
        ...(answers.deadlift_kg !== undefined ? { deadlift: answers.deadlift_kg } : {}),
        ...(answers.overhead_press_kg !== undefined
          ? { overhead_press: answers.overhead_press_kg }
          : {}),
      },
    },
    nutrition: null,
    activities: null,
    schedule_preferences: { days_per_week: answers.days_per_week, rest_day: answers.rest_day },
    notes: null,
  };
}
