/** Format an ISO calendar date `YYYY-MM-DD` as `DD/MM/YYYY`. */
export function formatIsoDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) {
    throw new Error(`expected YYYY-MM-DD, got ${isoDate}`);
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}
