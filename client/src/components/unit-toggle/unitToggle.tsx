import type { JSX } from 'react';

import { Button } from '@/shadcn/ui/button';
import type { UnitPreference } from '@/utils/units';

const UNIT_OPTIONS = [
  { value: 'imperial', label: 'Pounds (lb)' },
  { value: 'metric', label: 'Kilograms (kg)' },
] as const;

type Props = {
  value: UnitPreference | undefined;
  onChange: (unit: UnitPreference) => void;
  disabled?: boolean;
};

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
