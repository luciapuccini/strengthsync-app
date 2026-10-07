import { useAppStore } from './useAppStore';
import type { UnitPreference } from '@/utils/units';

export function useUnitPreference(): UnitPreference {
  return useAppStore((state) => state.sessionClient?.unit_preference ?? 'imperial');
}
