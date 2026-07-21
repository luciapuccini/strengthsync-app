import type { ApiError } from '@strengthsync/domain/contracts'
import type { DayType } from '@strengthsync/domain/model'

/**
 * Placeholder proving the ui → domain edge (HTTP contracts + presentation
 * types only). The React browser app arrives with the UI milestone.
 * See docs/architecture/monorepo_structure.md.
 */
export type WeekDayHeader = {
  dayIndex: number
  type: DayType
}

export function toApiError(code: string, message: string): ApiError {
  return { error: { code, message } }
}
