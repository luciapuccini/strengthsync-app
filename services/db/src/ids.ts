/** UUIDv4 ids. `crypto.randomUUID` is available in Workers and Node 22. */
export function newId(): string {
  return crypto.randomUUID()
}
