import type { JSX } from 'react';

import { Input } from '@/shadcn/ui/input';
import { inchesToFeetInches } from '@/utils/units';

import { OnboardingField } from '../onboarding-field/onboardingField';

type Props = {
  /** A previously answered height, in inches, if the athlete stepped back. */
  defaultInches: number | undefined;
  error: string | undefined;
};

/**
 * Two inputs for one stored value. The pair is recombined by the step's
 * `validate`, so the schema and any error it reports stay keyed to the single
 * `height_in` field rather than to either half.
 */
export function HeightField({ defaultInches, error }: Props): JSX.Element {
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
