import type { components } from './openapi';

export type ApiError = components['schemas']['ApiError'];
export type ClientProfile = components['schemas']['ClientProfile'];
export type DayExerciseLog = components['schemas']['DayExerciseLog'];
export type DayType = components['schemas']['DayType'];
export type ExerciseFeedback = components['schemas']['ExerciseFeedback'];
export type ExerciseLog = components['schemas']['ExerciseLog'];
export type OnboardingAnswers = components['schemas']['OnboardingAnswers'];
export type PerformedSet = components['schemas']['PerformedSet'];
export type Plan = components['schemas']['Plan'];
export type PlanDay = components['schemas']['PlanDay'];
export type PlannedExercise = components['schemas']['PlannedExercise'];
export type SaveDayLog = components['schemas']['SaveDayLog'];
export type UpdateClientProfile = components['schemas']['UpdateClientProfile'];
export type UpdateDayLog = components['schemas']['UpdateDayLog'];
export type Week = components['schemas']['Week'];
export type WeekDay = components['schemas']['WeekDay'];
export type WeekStatus = components['schemas']['WeekStatus'];

/**
 * The one type here that is not generated, and deliberately temporary.
 *
 * `Client` left the contract in `issues/011-amputate-old-auth.md`: the only
 * routes that returned one were `/auth/sign-up`, `/auth/sign-in` and
 * `/auth/session`, so deleting them removed the schema from `openapi.json`
 * altogether. `GET /api/me` in
 * `issues/012-token-verification-and-provisioning.md` puts it back, and this
 * declaration goes when it does — restoring the project's rule that a payload
 * shape is pinned by a Zod schema at the boundary and read from the generated
 * contract, never hand-written on this side of it.
 *
 * It is spelled out rather than narrowed to `{ id: string }` so that the state
 * it types — `sessionSlice.sessionClient` and `trackerSlice.client` — keeps its
 * shape, which is what lets `RequireAuth` and `RootRedirect` go untouched.
 */
export type Client = {
  id: string;
  coach_id: string;
  display_name: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
};
