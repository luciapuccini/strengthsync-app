/**
 * Public surface of @strengthsync/db: the Drizzle/D1 persistence adapter.
 * Exposes intent-level operations to apps/api — not raw tables.
 * See docs/architecture/monorepo_structure.md.
 */

export { createDb, type Db } from "./db.ts";
export { RepoError, type RepoErrorKind } from "./errors.ts";
export * as schema from "./schema.ts";

export {
  createClient,
  getClient,
  listClients,
} from "./repositories/clients.ts";
export { getProfile, upsertProfile } from "./repositories/profiles.ts";
export { getActivePlan, getPlan, listPlans } from "./repositories/plans.ts";
export {
  getCurrentWeek,
  getWeek,
  listWeeks,
  listWeeksV2,
  saveDay,
  updateDayLog,
  // WIP: this will live close to Service, just keeping exports pattern for migraiton
  completeWeek as completeWeekV2,
  saveNextWeek,
} from "./repositories/weeks.ts";
export {
  activateGeneratedPlan,
  completeWeek,
  createNextWeek,
  getPlanGenerationContext,
  getWeeklyContext,
} from "./repositories/internal.ts";
