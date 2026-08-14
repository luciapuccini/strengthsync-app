import { useActionState } from 'react';
import type { JSX } from 'react';

import {
  ONBOARDING_SEXES,
  PersonalStepSchema,
  fieldErrors,
  optionalNumber,
  type PersonalStepAnswers,
  type StepFieldErrors,
} from '@/lib/onboarding-schema';
import { Button } from '@/shadcn/ui/button';
import { Input } from '@/shadcn/ui/input';

import { OnboardingField } from '../onboarding-field/onboardingField';
import { OnboardingSelect } from '../onboarding-select/onboardingSelect';

type Props = {
  defaults: Partial<PersonalStepAnswers>;
  onNext: (answers: PersonalStepAnswers) => void;
};

function validate(form: FormData): { errors: StepFieldErrors } | { data: PersonalStepAnswers } {
  const result = PersonalStepSchema.safeParse({
    sex: form.get('sex'),
    age: optionalNumber(form.get('age')),
    height_cm: optionalNumber(form.get('height_cm')),
    weight_kg: optionalNumber(form.get('weight_kg')),
    body_fat_percent: optionalNumber(form.get('body_fat_percent')),
  });
  return result.success ? { data: result.data } : { errors: fieldErrors(result.error) };
}

/** Who the client is: sex, age, height, current weight, and optional body fat. */
export function PersonalStep({ defaults, onNext }: Props): JSX.Element {
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
      <h1 className="text-xl font-semibold">Who are you?</h1>

      <OnboardingField id="onboarding-sex" label="Sex" error={errors?.sex}>
        <OnboardingSelect id="onboarding-sex" name="sex" defaultValue={defaults.sex ?? ''} required>
          <option value="" disabled>
            Select…
          </option>
          {ONBOARDING_SEXES.map((sex) => (
            <option key={sex} value={sex}>
              {sex}
            </option>
          ))}
        </OnboardingSelect>
      </OnboardingField>

      <OnboardingField id="onboarding-age" label="Age" error={errors?.age}>
        <Input
          id="onboarding-age"
          name="age"
          type="number"
          inputMode="numeric"
          defaultValue={defaults.age}
          required
        />
      </OnboardingField>

      <OnboardingField id="onboarding-height" label="Height (cm)" error={errors?.height_cm}>
        <Input
          id="onboarding-height"
          name="height_cm"
          type="number"
          inputMode="decimal"
          defaultValue={defaults.height_cm}
          required
        />
      </OnboardingField>

      <OnboardingField id="onboarding-weight" label="Current weight (kg)" error={errors?.weight_kg}>
        <Input
          id="onboarding-weight"
          name="weight_kg"
          type="number"
          inputMode="decimal"
          defaultValue={defaults.weight_kg}
          required
        />
      </OnboardingField>

      <OnboardingField
        id="onboarding-body-fat"
        label="Body fat % (optional)"
        error={errors?.body_fat_percent}
      >
        <Input
          id="onboarding-body-fat"
          name="body_fat_percent"
          type="number"
          inputMode="decimal"
          defaultValue={defaults.body_fat_percent}
        />
      </OnboardingField>

      <Button type="submit" size="xl" className="w-full">
        Continue
      </Button>
    </form>
  );
}
