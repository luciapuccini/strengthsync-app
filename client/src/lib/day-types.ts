export const DAY_TYPES = [
  'upper_body',
  'leg_day',
  'full_body',
  'rest',
  'activity',
  'cardio',
] as const;

export const DAY_TYPE_LABELS: Record<(typeof DAY_TYPES)[number], string> = {
  upper_body: 'Upper body',
  leg_day: 'Leg day',
  full_body: 'Full body',
  activity: 'Activity',
  cardio: 'Cardio',
  rest: 'Rest',
};
