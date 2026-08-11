/**
 * Repository error with a machine-readable code. `server` maps `kind`
 * to an HTTP status: not_found → 404, validation → 400, conflict → 409.
 */
export type RepoErrorKind = 'not_found' | 'validation' | 'conflict'

export class RepoError extends Error {
  readonly kind: RepoErrorKind
  readonly code: string

  constructor(kind: RepoErrorKind, code: string, message: string) {
    super(message)
    this.name = 'RepoError'
    this.kind = kind
    this.code = code
  }
}
