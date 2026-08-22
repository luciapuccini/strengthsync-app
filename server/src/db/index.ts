/**
 * The Drizzle/D1 persistence adapter: intent-level operations, not raw
 * tables. See docs/architecture/domain_model.md.
 */

export { createDb, type Db } from './db.ts';
export { RepoError, type RepoErrorKind } from './errors.ts';
export * as schema from './schema.ts';
export { addDays, todayIso } from './dates.ts';

export {
  createClient,
  deleteClient,
  getClient,
  updateUnitPreference,
} from './repositories/clients.ts';
export {
  claimSubject,
  deleteIdentity,
  deleteUnboundClient,
  findClientIdBySubject,
  findSubjectByClientId,
} from './repositories/identities.ts';
export { deleteProfile, findProfile, getProfile, upsertProfile } from './repositories/profiles.ts';
export {
  activateGeneratedPlan,
  deletePlans,
  findPlanById,
  getActivePlan,
  getActivePlanOrThrow,
  listPlans,
} from './repositories/plans.ts';
export {
  deleteWeeks,
  getCurrentWeek,
  getWeek,
  listWeeks,
  saveDay,
  updateDayLog,
  completeWeek,
  saveNextWeek,
} from './repositories/weeks.ts';
