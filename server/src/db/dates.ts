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
