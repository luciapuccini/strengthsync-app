import type { JSX } from 'react';

import { Input } from '@/shadcn/ui/input';
import { inchesToFeetInches, type UnitPreference } from '@/utils/units';

import { OnboardingField } from '@/routes/onboarding/components/onboarding-field/onboardingField';

import { CentimetreHeight } from './components/centimetre-height/centimetreHeight';

type Props = {
  defaultInches: number | undefined;
  unit: UnitPreference;
  error: string | undefined;
};

export function HeightField({ defaultInches, unit, error }: Props): JSX.Element {
  if (unit === 'metric') {
    return <CentimetreHeight defaultInches={defaultInches} error={error} />;
  }

  const height = defaultInches === undefined ? undefined : inchesToFeetInches(defaultInches);

  return (
    <OnboardingField id="onboarding-height-ft" label="Height" error={error}>
      <div className="flex gap-3">
        <Input
          id="onboarding-height-ft"
          name="height_ft"
          type="number"
          inputMode="numeric"
          placeholder="ft"
          aria-label="Height, feet"
          defaultValue={height?.feet}
          required
        />
        <Input
          id="onboarding-height-inches"
          name="height_inches"
          type="number"
          inputMode="numeric"
          placeholder="in"
          aria-label="Height, inches"
          defaultValue={height?.inches}
          required
        />
      </div>
    </OnboardingField>
  );
}
