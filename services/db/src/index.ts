import type { WeekStatus } from '@strengthsync/domain/model'

/**
 * Placeholder row shape proving the db → domain edge.
 * The Drizzle/D1 schema, migrations, and intent-level repositories
 * (getCurrentWeek, completeWeek, createNextWeek, ...) arrive with the
 * D1 milestone. See docs/architecture/monorepo_structure.md.
 */
export type WeekRowPreview = {
  id: string
  status: WeekStatus
  /** JSON column validated against the domain Week schedule schema. */
  schedule_json: string
}
