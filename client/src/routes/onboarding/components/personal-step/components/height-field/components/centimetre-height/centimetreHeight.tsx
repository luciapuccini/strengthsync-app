import type { JSX } from 'react';

import { Input } from '@/shadcn/ui/input';
import { inchesToCm } from '@/utils/units';

import { OnboardingField } from '@/routes/onboarding/components/onboarding-field/onboardingField';

type Props = {
  /** A previously answered height, in canonical inches, if the athlete stepped back. */
  defaultInches: number | undefined;
  error: string | undefined;
};

/** The metric half of the height question. See docs/architecture/domain_model.md. */
export function CentimetreHeight({ defaultInches, error }: Props): JSX.Element {
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
