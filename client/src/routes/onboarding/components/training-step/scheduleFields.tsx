import type { JSX } from 'react';

import {
  ONBOARDING_WEEKDAYS,
  type OnboardingDraft,
  type StepFieldErrors,
} from '@/lib/onboarding-schema';
import { Input } from '@/shadcn/ui/input';

import { OnboardingField } from '../onboarding-field/onboardingField';
import { OnboardingSelect } from '../onboarding-select/onboardingSelect';

type Props = {
  priorAnswers: OnboardingDraft;
  errors: StepFieldErrors;
};

/** How many days a week the client trains, and which day is their usual rest day. */
export function ScheduleFields({ priorAnswers, errors }: Props): JSX.Element {
  return (
    <>
      <OnboardingField
        id="onboarding-days-per-week"
        label="Training days per week"
        error={errors.days_per_week}
      >
        <Input
          id="onboarding-days-per-week"
          name="days_per_week"
          type="number"
          inputMode="numeric"
          min={1}
          max={7}
          defaultValue={priorAnswers.days_per_week}
          required
        />
      </OnboardingField>

      <OnboardingField id="onboarding-rest-day" label="Usual rest day" error={errors.rest_day}>
        <OnboardingSelect
          id="onboarding-rest-day"
          name="rest_day"
          defaultValue={priorAnswers.rest_day ?? ''}
          required
        >
          <option value="" disabled>
            Select…
          </option>
          {ONBOARDING_WEEKDAYS.map(({ day_index, label }) => (
            <option key={day_index} value={day_index}>
              {label}
            </option>
          ))}
        </OnboardingSelect>
      </OnboardingField>
    </>
  );
}
