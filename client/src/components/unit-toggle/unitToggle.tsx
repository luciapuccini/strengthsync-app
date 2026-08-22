import type { JSX } from 'react';

import { Button } from '@/shadcn/ui/button';
import type { UnitPreference } from '@/utils/units';

/**
 * Two buttons rather than a segmented control: there is no tabs, toggle-group,
 * radio-group or switch primitive in `shadcn/ui`, and one setting is not a
 * reason to add one.
 */
const UNIT_OPTIONS = [
  { value: 'imperial', label: 'Pounds (lb)' },
  { value: 'metric', label: 'Kilograms (kg)' },
] as const;

type Props = {
  /** Undefined while the Account page is still waiting for the session client. */
  value: UnitPreference | undefined;
  onChange: (unit: UnitPreference) => void;
  disabled?: boolean;
};

/**
 * The unit control, with no opinion about where the value comes from.
 *
 * Presentational on purpose: the Account page drives it from the session store
 * and reports a failed write, onboarding drives it from wizard state and treats
 * the write as best-effort. Those two policies have nothing in common, so what
 * is shared is the button pair and the wording, and nothing else.
 */
export function UnitToggle({ value, onChange, disabled = false }: Props): JSX.Element {
  return (
    <div className="flex gap-2">
      {UNIT_OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? 'default' : 'outline'}
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
