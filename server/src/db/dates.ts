/** UTC date helpers for ISO week dates (`YYYY-MM-DD`). Weeks run Monday–Sunday. */

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

/** Monday of the ISO week containing `isoDate`. */
export function startOfISOWeek(isoDate: string): string {
  const [year, month, day] = parseIsoDate(isoDate);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return addDays(isoDate, -daysSinceMonday);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIso(): string {
  return nowIso().slice(0, 10);
}
