/**
 * The Drizzle/D1 persistence adapter: intent-level operations, not raw
 * tables. See docs/architecture/domain_model.md.
 */

export { createDb, type Db } from './db.ts';
export { RepoError, type RepoErrorKind } from './errors.ts';
export * as schema from './schema.ts';
export { addDays, todayIso } from './dates.ts';

export { createClient, getClient } from './repositories/clients.ts';
export { findProfile, getProfile, upsertProfile } from './repositories/profiles.ts';
export {
  activateGeneratedPlan,
  findPlanById,
  getActivePlan,
  getActivePlanOrThrow,
  listPlans,
} from './repositories/plans.ts';
export {
  getCurrentWeek,
  getWeek,
  listWeeks,
  saveDay,
  updateDayLog,
  completeWeek,
  saveNextWeek,
} from './repositories/weeks.ts';
