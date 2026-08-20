/**
 * UTC date helpers for ISO dates (`YYYY-MM-DD`). A training week is a rolling
 * seven-day window anchored to the day the athlete's plan was activated, not a
 * Monday–Sunday calendar week.
 */

function parseIsoDate(isoDate: string): [number, number, number] {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) {
    throw new Error(`invalid ISO date: ${isoDate}`);
  }
  return parts as [number, number, number];
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = parseIsoDate(isoDate);
  const ms = Date.UTC(year, month - 1, day) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIso(): string {
  return nowIso().slice(0, 10);
}

/** ISO weekday of a date, 1 = Monday … 7 = Sunday, UTC. */
export function isoWeekday(isoDate: string): number {
  const [year, month, day] = parseIsoDate(isoDate);
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Date a `day_index` (ISO weekday, 1 = Monday … 7 = Sunday) within the
 * seven-day window starting at `start`, rotating the window so it begins on
 * `start`'s own weekday instead of always on Monday.
 */
export function dateForDayIndex(start: string, dayIndex: number): string {
  const offset = (dayIndex - isoWeekday(start) + 7) % 7;
  return addDays(start, offset);
}
