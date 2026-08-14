import type { ClientProfileWrite, JsonValue } from '../model/index.ts';

import type { OnboardingAnswers } from './schema.ts';

function mapGoals(answers: OnboardingAnswers) {
  return {
    goal: answers.goal,
    ...(answers.target_date !== undefined ? { target_date: answers.target_date } : {}),
    ...(answers.target_weight_kg !== undefined
      ? { target_weight_kg: answers.target_weight_kg }
      : {}),
    ...(answers.note !== undefined ? { note: answers.note } : {}),
  };
}

function mapStrengthLoads(answers: OnboardingAnswers) {
  return {
    experience: answers.experience,
    lifts: {
      ...(answers.squat_kg !== undefined ? { squat: answers.squat_kg } : {}),
      ...(answers.bench_press_kg !== undefined ? { bench_press: answers.bench_press_kg } : {}),
      ...(answers.deadlift_kg !== undefined ? { deadlift: answers.deadlift_kg } : {}),
      ...(answers.overhead_press_kg !== undefined
        ? { overhead_press: answers.overhead_press_kg }
        : {}),
    },
  };
}

function mapNutrition(answers: OnboardingAnswers): Record<string, JsonValue> | null {
  const nutrition = {
    ...(answers.eating_phase !== undefined ? { eating_phase: answers.eating_phase } : {}),
    ...(answers.protein_target_g !== undefined
      ? { protein_target_g: answers.protein_target_g }
      : {}),
  };
  return Object.keys(nutrition).length > 0 ? nutrition : null;
}

function mapActivities(answers: OnboardingAnswers): Record<string, JsonValue> | null {
  if (answers.activities === undefined || answers.activities.length === 0) return null;
  return {
    items: answers.activities.map(({ name, sessions_per_week, note }) => ({
      name,
      sessions_per_week,
      ...(note !== undefined ? { note } : {}),
    })),
  };
}

function mapSchedulePreferences(answers: OnboardingAnswers) {
  return {
    days_per_week: answers.days_per_week,
    rest_day: answers.rest_day,
    ...(answers.daily_activity_level !== undefined
      ? { daily_activity_level: answers.daily_activity_level }
      : {}),
  };
}

/**
 * Pure answers-to-profile mapping: the one place that knows which profile
 * column each onboarding answer belongs to. No I/O, no framework.
 *
 * `snapshot_date` is the caller's to set: this function stays free of the
 * clock.
 */
export function mapAnswersToProfileWrite(
  answers: OnboardingAnswers,
): Omit<ClientProfileWrite, 'snapshot_date'> {
  return {
    sex: answers.sex,
    age: answers.age,
    height_cm: answers.height_cm,
    goals: mapGoals(answers),
    body_composition: {
      weight_kg: answers.weight_kg,
      ...(answers.body_fat_percent !== undefined
        ? { body_fat_percent: answers.body_fat_percent }
        : {}),
    },
    strength_loads: mapStrengthLoads(answers),
    nutrition: mapNutrition(answers),
    activities: mapActivities(answers),
    schedule_preferences: mapSchedulePreferences(answers),
    notes: answers.injury_note ?? null,
  };
}
