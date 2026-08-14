import type { JSX } from 'react';

import {
  ONBOARDING_DAILY_ACTIVITY_LEVELS,
  ONBOARDING_EATING_PHASES,
  type OnboardingDraft,
  type StepFieldErrors,
} from '@/lib/onboarding-schema';
import { Input } from '@/shadcn/ui/input';
import { Textarea } from '@/shadcn/ui/textarea';

import { OnboardingField } from '../onboarding-field/onboardingField';
import { OnboardingSelect } from '../onboarding-select/onboardingSelect';

type Props = {
  defaults: OnboardingDraft;
  errors: StepFieldErrors;
};

/** How active the client's day is outside training, how they eat, and any injury. */
export function LifeFields({ defaults, errors }: Props): JSX.Element {
  return (
    <>
      <OnboardingField
        id="onboarding-daily-activity"
        label="Daily activity outside training (optional)"
        error={errors.daily_activity_level}
      >
        <OnboardingSelect
          id="onboarding-daily-activity"
          name="daily_activity_level"
          defaultValue={defaults.daily_activity_level ?? ''}
        >
          <option value="">Skip</option>
          {ONBOARDING_DAILY_ACTIVITY_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level.replace('_', ' ')}
            </option>
          ))}
        </OnboardingSelect>
      </OnboardingField>

      <OnboardingField
        id="onboarding-eating-phase"
        label="Eating phase (optional)"
        error={errors.eating_phase}
      >
        <OnboardingSelect
          id="onboarding-eating-phase"
          name="eating_phase"
          defaultValue={defaults.eating_phase ?? ''}
        >
          <option value="">Skip</option>
          {ONBOARDING_EATING_PHASES.map((phase) => (
            <option key={phase} value={phase}>
              {phase}
            </option>
          ))}
        </OnboardingSelect>
      </OnboardingField>

      <OnboardingField
        id="onboarding-protein-target"
        label="Protein target, g/day (optional)"
        error={errors.protein_target_g}
      >
        <Input
          id="onboarding-protein-target"
          name="protein_target_g"
          type="number"
          inputMode="numeric"
          defaultValue={defaults.protein_target_g}
        />
      </OnboardingField>

      <OnboardingField
        id="onboarding-injury-note"
        label="Anything else — injuries, movements to avoid (optional)"
        error={errors.injury_note}
      >
        <Textarea
          id="onboarding-injury-note"
          name="injury_note"
          defaultValue={defaults.injury_note}
          rows={3}
        />
      </OnboardingField>
    </>
  );
}
