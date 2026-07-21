/**
 * Browser-safe API request/response DTOs.
 * See docs/architecture/api_contracts.md — route DTOs arrive with the
 * internal API boundary milestone.
 */

export type ApiError = {
  error: {
    code: string
    message: string
  }
}
