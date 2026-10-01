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

/** Display names for each day type. Used by the tracker day header and the history CSV. */
export const DAY_TYPE_LABELS: Record<(typeof DAY_TYPES)[number], string> = {
  upper_body: 'Upper body',
  leg_day: 'Leg day',
  full_body: 'Full body',
  activity: 'Activity',
  cardio: 'Cardio',
  rest: 'Rest',
};
