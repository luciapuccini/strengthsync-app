import { useActionState } from 'react';
import type { JSX } from 'react';

import {
  ONBOARDING_GOALS,
  GoalStepSchema,
  fieldErrors,
  optionalNumber,
  optionalText,
  type GoalStepAnswers,
  type StepFieldErrors,
} from '@/lib/onboarding-schema';
import { Button } from '@/shadcn/ui/button';
import { Input } from '@/shadcn/ui/input';
import { Textarea } from '@/shadcn/ui/textarea';

import { OnboardingField } from '../onboarding-field/onboardingField';
import { OnboardingSelect } from '../onboarding-select/onboardingSelect';

type Props = {
  defaults: Partial<GoalStepAnswers>;
  onBack: () => void;
  onNext: (answers: GoalStepAnswers) => void;
};

function validate(form: FormData): { errors: StepFieldErrors } | { data: GoalStepAnswers } {
  const result = GoalStepSchema.safeParse({
    goal: form.get('goal'),
    target_date: optionalText(form.get('target_date')),
    target_weight_kg: optionalNumber(form.get('target_weight_kg')),
    note: optionalText(form.get('note')),
  });
  return result.success ? { data: result.data } : { errors: fieldErrors(result.error) };
}

/** What the client wants: one primary goal, and optionally a target and a note. */
export function GoalStep({ defaults, onBack, onNext }: Props): JSX.Element {
  const [errors, formAction] = useActionState<StepFieldErrors | null, FormData>(
    (_previous, form) => {
      const result = validate(form);
      if ('errors' in result) return result.errors;
      onNext(result.data);
      return null;
    },
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">What&apos;s your goal?</h1>

      <OnboardingField id="onboarding-goal" label="Primary goal" error={errors?.goal}>
        <OnboardingSelect
          id="onboarding-goal"
          name="goal"
          defaultValue={defaults.goal ?? ''}
          required
        >
          <option value="" disabled>
            Select…
          </option>
          {ONBOARDING_GOALS.map((goal) => (
            <option key={goal} value={goal}>
              {goal.replace('_', ' ')}
            </option>
          ))}
        </OnboardingSelect>
      </OnboardingField>

      <OnboardingField
        id="onboarding-target-date"
        label="Target date (optional)"
        error={errors?.target_date}
      >
        <Input
          id="onboarding-target-date"
          name="target_date"
          type="date"
          defaultValue={defaults.target_date}
        />
      </OnboardingField>

      <OnboardingField
        id="onboarding-target-weight"
        label="Target weight, kg (optional)"
        error={errors?.target_weight_kg}
      >
        <Input
          id="onboarding-target-weight"
          name="target_weight_kg"
          type="number"
          inputMode="decimal"
          defaultValue={defaults.target_weight_kg}
        />
      </OnboardingField>

      <OnboardingField id="onboarding-note" label="Anything else? (optional)" error={errors?.note}>
        <Textarea id="onboarding-note" name="note" defaultValue={defaults.note} rows={3} />
      </OnboardingField>

      <div className="flex gap-3">
        <Button type="button" variant="outline" size="xl" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" size="xl" className="flex-1">
          Continue
        </Button>
      </div>
    </form>
  );
}
