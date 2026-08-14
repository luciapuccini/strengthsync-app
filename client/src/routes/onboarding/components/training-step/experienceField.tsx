import type { JSX } from 'react';

import { ONBOARDING_EXPERIENCE_LEVELS, type OnboardingExperience } from '@/lib/onboarding-schema';

import { OnboardingField } from '../onboarding-field/onboardingField';
import { OnboardingSelect } from '../onboarding-select/onboardingSelect';

type Props = {
  defaultValue: OnboardingExperience | '';
  error: string | undefined;
  onChange: (value: OnboardingExperience | '') => void;
};

export function ExperienceField({ defaultValue, error, onChange }: Props): JSX.Element {
  return (
    <OnboardingField id="onboarding-experience" label="Training experience" error={error}>
      <OnboardingSelect
        id="onboarding-experience"
        name="experience"
        defaultValue={defaultValue}
        onChange={(e) => onChange(e.target.value as OnboardingExperience | '')}
        required
      >
        <option value="" disabled>
          Select…
        </option>
        {ONBOARDING_EXPERIENCE_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </OnboardingSelect>
    </OnboardingField>
  );
}
