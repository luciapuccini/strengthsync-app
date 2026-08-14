import type { ClientProfile } from '../model/index.ts';

/**
 * The prompt for a client's very first plan. Unlike plan turnover, there is
 * no completed history to summarize and no previous plan to react to, so the
 * stored profile goes into the prompt as-is — one call, not two.
 */

export type FirstPlanPrompt = { system: string; prompt: string };

export function buildFirstPlanPrompt(profile: ClientProfile, rules: string): FirstPlanPrompt {
  return {
    system: [
      "You are a strength coach generating a new client's first training plan.",
      'Produce a canonical week_template for days 1–7 with exercise_key, series, reps, rest, and optional weight.',
      'week_template must include every day_index from 1 to 7 exactly once.',
      'The number of lifting days must equal the days per week the client can train, read from',
      'schedule_preferences.days_per_week. Non-lifting days are rest or, where the client has',
      "declared an outside activity in the profile's activities field, that activity.",
      'Follow the coaching rules. This client has no training history: leave weight_kg null for',
      'any lift with no known load in strength_loads, and never invent one.',
    ].join(' '),
    prompt: JSON.stringify({ coaching_rules: rules, profile }, null, 2),
  };
}
