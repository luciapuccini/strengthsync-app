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
import { feetInchesToInches } from '@/utils/units';

import { HeightField } from './heightField';
import { OnboardingField } from '../onboarding-field/onboardingField';
import { OnboardingSelect } from '../onboarding-select/onboardingSelect';

type Props = {
  defaults: Partial<PersonalStepAnswers>;
  onNext: (answers: PersonalStepAnswers) => void;
};

/**
 * Height is asked for as two inputs but stored as one number, so the pair is
 * composed here and the schema — and any error it reports — stays keyed to the
 * single `height_in` field beneath them.
 */
function heightInches(form: FormData): number | undefined {
  const feet = optionalNumber(form.get('height_ft'));
  const inches = optionalNumber(form.get('height_inches'));
  if (feet === undefined && inches === undefined) return undefined;
  return feetInchesToInches(feet ?? 0, inches ?? 0);
}

function validate(form: FormData): { errors: StepFieldErrors } | { data: PersonalStepAnswers } {
  const result = PersonalStepSchema.safeParse({
    sex: form.get('sex'),
    age: optionalNumber(form.get('age')),
    height_in: heightInches(form),
    weight_lb: optionalNumber(form.get('weight_lb')),
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

      <HeightField defaultInches={defaults.height_in} error={errors?.height_in} />

      <OnboardingField id="onboarding-weight" label="Current weight (lb)" error={errors?.weight_lb}>
        <Input
          id="onboarding-weight"
          name="weight_lb"
          type="number"
          inputMode="decimal"
          defaultValue={defaults.weight_lb}
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
