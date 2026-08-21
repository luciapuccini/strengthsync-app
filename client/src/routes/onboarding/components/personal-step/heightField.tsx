import type { JSX } from 'react';

import { Input } from '@/shadcn/ui/input';
import { inchesToCm, inchesToFeetInches, type UnitPreference } from '@/utils/units';

import { OnboardingField } from '../onboarding-field/onboardingField';

type Props = {
  /** A previously answered height, in canonical inches, if the athlete stepped back. */
  defaultInches: number | undefined;
  unit: UnitPreference;
  error: string | undefined;
};

/**
 * One centimetre input, for a metric athlete. Kept in this file rather than its
 * own because the two shapes are alternatives for the same answer and the
 * step's `validate` reads whichever of them was rendered.
 */
function CentimetreHeight({ defaultInches, error }: Omit<Props, 'unit'>): JSX.Element {
  return (
    <OnboardingField id="onboarding-height-cm" label="Height (cm)" error={error}>
      <Input
        id="onboarding-height-cm"
        name="height_cm"
        type="number"
        inputMode="numeric"
        defaultValue={defaultInches === undefined ? undefined : inchesToCm(defaultInches)}
        required
      />
    </OnboardingField>
  );
}

/**
 * Two inputs for one stored value, or one under metric. Either shape is
 * recombined into inches by the step's `validate`, so the schema and any error
 * it reports stay keyed to the single `height_in` field rather than to a half
 * of an input pair that only one kind of athlete sees.
 */
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
