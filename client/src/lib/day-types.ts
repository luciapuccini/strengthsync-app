/**
 * UI-local runtime list of day types. The wire contract defines the same enum;
 * this array exists for places that need a runtime value (e.g. Zod schemas)
 * without importing server domain code.
 */
export const DAY_TYPES = [
  'upper_body',
  'leg_day',
  'full_body',
  'rest',
  'activity',
  'cardio',
] as const;

/**
 * How a day type reads on screen. One map, because the tracker's day header
 * and the onboarding progress rows both name the same six things and a second
 * copy would drift.
 */
export const DAY_TYPE_LABELS: Record<(typeof DAY_TYPES)[number], string> = {
  upper_body: 'Upper body',
  leg_day: 'Leg day',
  full_body: 'Full body',
  activity: 'Activity',
  cardio: 'Cardio',
  rest: 'Rest',
};
