import { getActivePlan } from '@/api/client';
import type { Plan } from '@/api/types';

let activePlanPromise: Promise<Plan | null> | null = null;

export function activePlanResource(): Promise<Plan | null> {
  activePlanPromise ??= getActivePlan().catch((error: unknown) => {
    activePlanPromise = null;
    throw error;
  });
  return activePlanPromise;
}

export function invalidateActivePlan(): void {
  activePlanPromise = null;
}
