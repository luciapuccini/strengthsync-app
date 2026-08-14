import type { ClientProfileWrite } from '../model/index.ts';

import type { OnboardingAnswers } from './schema.ts';

/**
 * Pure answers-to-profile mapping: the one place that knows which profile
 * column each onboarding answer belongs to. No I/O, no framework.
 *
 * `strength_loads`, `nutrition` and `activities` are placeholders here —
 * `issues/004-training-step.md` and `issues/005-life-step.md` extend this
 * mapper to fill them from the training and life steps. `snapshot_date` is
 * the caller's to set: this function stays free of the clock.
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
    strength_loads: {},
    nutrition: null,
    activities: null,
    schedule_preferences: { days_per_week: answers.days_per_week },
    notes: null,
  };
}
