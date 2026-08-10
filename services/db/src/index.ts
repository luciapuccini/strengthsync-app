/**
 * Public surface of @strengthsync/db: the Drizzle/D1 persistence adapter.
 * Exposes intent-level operations to apps/api — not raw tables.
 * See docs/architecture/monorepo_structure.md.
 */

export { createDb, type Db } from "./db.ts";
export { RepoError, type RepoErrorKind } from "./errors.ts";
export * as schema from "./schema.ts";
export { addDays, todayIso } from "./dates.ts";

export {
  createClient,
  getClient,
  listClients,
} from "./repositories/clients.ts";
export { getProfile, upsertProfile } from "./repositories/profiles.ts";
export {
  activateGeneratedPlanV2,
  getActivePlan,
  getPlan,
  listPlans,
} from "./repositories/plans.ts";
export {
  getCurrentWeek,
  getWeek,
  listWeeks,
  listWeeksV2,
  saveDay,
  updateDayLog,
  completeWeek,
  saveNextWeek,
} from "./repositories/weeks.ts";
