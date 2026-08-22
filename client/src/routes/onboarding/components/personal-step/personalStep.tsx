import { useActionState } from 'react';
import type { JSX } from 'react';

import {
  ONBOARDING_SEXES,
  PersonalStepSchema,
  displayedWeight,
  fieldErrors,
  optionalCanonicalWeight,
  optionalNumber,
  type PersonalStepAnswers,
  type StepFieldErrors,
} from '@/lib/onboarding-schema';
import { Button } from '@/shadcn/ui/button';
import { Input } from '@/shadcn/ui/input';
import { cmToInches, feetInchesToInches, unitLabel, type UnitPreference } from '@/utils/units';

import { HeightField } from './components/height-field/heightField';
import { OnboardingField } from '../onboarding-field/onboardingField';
import { OnboardingSelect } from '../onboarding-select/onboardingSelect';

type Props = {
  defaults: Partial<PersonalStepAnswers>;
  unit: UnitPreference;
  onNext: (answers: PersonalStepAnswers) => void;
};

/**
 * Height is asked for as a feet-and-inches pair or as centimetres, but stored
 * as one number either way, so whichever shape was rendered is reduced to
 * inches here and the schema — and any error it reports — stays keyed to the
 * single `height_in` field beneath it.
 */
function heightInches(form: FormData, unit: UnitPreference): number | undefined {
  if (unit === 'metric') {
    const cm = optionalNumber(form.get('height_cm'));
    return cm === undefined ? undefined : cmToInches(cm);
  }
  const feet = optionalNumber(form.get('height_ft'));
  const inches = optionalNumber(form.get('height_inches'));
  if (feet === undefined && inches === undefined) return undefined;
  return feetInchesToInches(feet ?? 0, inches ?? 0);
}

/** Converted before it is parsed, so the schema's bounds stay in pounds and inches. */
function validate(
  form: FormData,
  unit: UnitPreference,
): { errors: StepFieldErrors } | { data: PersonalStepAnswers } {
  const result = PersonalStepSchema.safeParse({
    sex: form.get('sex'),
    age: optionalNumber(form.get('age')),
    height_in: heightInches(form, unit),
    weight_lb: optionalCanonicalWeight(form.get('weight_lb'), unit),
    body_fat_percent: optionalNumber(form.get('body_fat_percent')),
  });
  return result.success ? { data: result.data } : { errors: fieldErrors(result.error) };
}

/** Who the client is: sex, age, height, current weight, and optional body fat. */
export function PersonalStep({ defaults, unit, onNext }: Props): JSX.Element {
  const [errors, formAction] = useActionState<StepFieldErrors | null, FormData>(
    (_previous, form) => {
      const result = validate(form, unit);
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

      <HeightField defaultInches={defaults.height_in} unit={unit} error={errors?.height_in} />

      <OnboardingField
        id="onboarding-weight"
        label={`Current weight (${unitLabel(unit)})`}
        error={errors?.weight_lb}
      >
        {/*
          Keyed on the unit so switching it remounts the input and re-applies
          the converted default. Without that, an uncontrolled input keeps
          whatever was already typed and the next submit reads it as the other
          unit — 160 lb quietly becoming 160 kg. Clearing the field is visible;
          misreading it is not. The height inputs change shape on the same
          switch, so they already behave this way.
        */}
        <Input
          key={unit}
          id="onboarding-weight"
          name="weight_lb"
          type="number"
          inputMode="decimal"
          defaultValue={displayedWeight(defaults.weight_lb, unit)}
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
