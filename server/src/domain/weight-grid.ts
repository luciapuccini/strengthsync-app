import { z } from 'zod';

/**
 * The five-pound grid.
 *
 * Every training load the athlete is shown has to be buildable from a standard
 * US plate set, and five pounds is the smallest practical jump on one. This is
 * the single home of that rule; it is composed onto the load fields of the
 * domain schemas rather than called from parse sites, so every path a load can
 * enter the system by — model output, inbound API writes, values read back from
 * storage — passes through it with no call site to remember.
 *
 * Only loads snap. Body weight and target weight are a measurement and a goal,
 * not something built from plates, and are left exactly as the athlete typed
 * them.
 */

const POUNDS_PER_STEP = 5;

/** Round a load to the nearest five pounds. Idempotent. */
export function snapToFivePounds(pounds: number): number {
  return Math.round(pounds / POUNDS_PER_STEP) * POUNDS_PER_STEP;
}

/**
 * The snap as a Zod transform, for composing onto a load field.
 *
 * An off-grid value is corrected and logged, never rejected: a model slip must
 * not fail a week generation. The log fires only when the value actually
 * changed, so re-parsing stored values stays silent.
 */
export function snapLoad(pounds: number): number {
  const snapped = snapToFivePounds(pounds);
  if (snapped !== pounds) {
    console.warn(`[coach] off-grid load ${pounds} lb snapped to ${snapped} lb`);
  }
  return snapped;
}

/**
 * A training load in pounds, snapped to the grid. Null — no load prescribed —
 * passes through untouched.
 */
export const LoadPoundsSchema = z.number().nonnegative().transform(snapLoad).nullable();
