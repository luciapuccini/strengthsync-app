import { z } from 'zod';

const POUNDS_PER_STEP = 5;

export function snapToFivePounds(pounds: number): number {
  return Math.round(pounds / POUNDS_PER_STEP) * POUNDS_PER_STEP;
}

export function snapLoad(pounds: number): number {
  const snapped = snapToFivePounds(pounds);
  if (snapped !== pounds) {
    console.warn(`[coach] off-grid load ${pounds} lb snapped to ${snapped} lb`);
  }
  return snapped;
}

export const LoadPoundsSchema = z.number().nonnegative().transform(snapLoad).nullable();
