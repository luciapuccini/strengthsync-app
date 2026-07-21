/**
 * Core domain value types.
 * See docs/architecture/domain_model.md — entities (Coach, Client,
 * ClientProfile, Plan, Week) arrive with the D1 schema milestone.
 */

export type DayType = 'upper_body' | 'leg_day' | 'rest' | 'swimming' | 'cardio'
export type ClientStatus = 'active' | 'archived'
export type PlanStatus = 'draft' | 'active' | 'archived'
export type WeekStatus = 'in_flight' | 'completed' | 'abandoned'
export type ExerciseFeedback = 'easy' | 'hard' | 'heavy' | 'light'
