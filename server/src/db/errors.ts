export type RepoErrorKind = 'not_found' | 'validation' | 'conflict';

export class RepoError extends Error {
  readonly kind: RepoErrorKind;
  readonly code: string;

  constructor(kind: RepoErrorKind, code: string, message: string) {
    super(message);
    this.name = 'RepoError';
    this.kind = kind;
    this.code = code;
  }
}
