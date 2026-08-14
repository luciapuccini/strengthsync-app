import type { JSX } from 'react';

import {
  ONBOARDING_MAIN_LIFTS,
  type OnboardingDraft,
  type OnboardingExperience,
  type StepFieldErrors,
} from '@/lib/onboarding-schema';
import { Input } from '@/shadcn/ui/input';

import { OnboardingField } from '../onboarding-field/onboardingField';

const LIFT_LABELS: Record<(typeof ONBOARDING_MAIN_LIFTS)[number], string> = {
  squat: 'Squat',
  bench_press: 'Bench press',
  deadlift: 'Deadlift',
  overhead_press: 'Overhead press',
};

type Props = {
  experience: OnboardingExperience | '';
  priorAnswers: OnboardingDraft;
  errors: StepFieldErrors;
};

/**
 * Always mounted, hidden via CSS rather than conditionally rendered: a
 * beginner's typed values must survive switching the experience answer back
 * and forth, which an unmount-on-hide would lose.
 */
export function LiftFields({ experience, priorAnswers, errors }: Props): JSX.Element {
  return (
    <div className={experience === 'beginner' ? 'hidden' : 'flex flex-col gap-4'}>
      {ONBOARDING_MAIN_LIFTS.map((lift) => (
        <OnboardingField
          key={lift}
          id={`onboarding-${lift}`}
          label={`${LIFT_LABELS[lift]} (kg, optional — skip if you don't train it)`}
          error={errors[`${lift}_kg`]}
        >
          <Input
            id={`onboarding-${lift}`}
            name={`${lift}_kg`}
            type="number"
            inputMode="decimal"
            defaultValue={priorAnswers[`${lift}_kg` as keyof OnboardingDraft] as number | undefined}
          />
        </OnboardingField>
      ))}
    </div>
  );
}
