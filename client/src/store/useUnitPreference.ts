import { useAppStore } from './useAppStore';
import type { UnitPreference } from '@/utils/units';

/**
 * The athlete's unit preference, for the display edge.
 *
 * It lives beside the session slice that holds it rather than inside it: the
 * slice is imported *by* `useAppStore`, so reading the store from within it
 * would close an import cycle and evaluate `createSessionSlice` before its
 * binding is initialised.
 *
 * Imperial is the fallback, not a guess: the tracker can render in the window
 * before `GET /api/me` resolves, and imperial is the default the column is
 * created with anyway.
 */
export function useUnitPreference(): UnitPreference {
  return useAppStore((state) => state.sessionClient?.unit_preference ?? 'imperial');
}
