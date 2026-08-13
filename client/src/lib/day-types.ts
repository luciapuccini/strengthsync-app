/**
 * UI-local runtime list of day types. The wire contract defines the same enum;
 * this array exists for places that need a runtime value (e.g. Zod schemas)
 * without importing server domain code.
 */
export const DAY_TYPES = ['upper_body', 'leg_day', 'rest', 'swimming', 'cardio'] as const;
