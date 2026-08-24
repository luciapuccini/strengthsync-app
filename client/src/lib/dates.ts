/**
 * The client's half of `server/src/db/dates.ts`. Week membership is decided
 * server-side in UTC, so anything the UI compares against `start_date` or
 * `end_date` has to be UTC too — a local calendar date would put the client
 * and the server on different days for most of the world.
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
