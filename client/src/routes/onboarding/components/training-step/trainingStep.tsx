import { useActionState, useState } from 'react';
import type { JSX } from 'react';

import {
  TrainingStepSchema,
  fieldErrors,
  optionalCanonicalWeight,
  optionalNumber,
  type OnboardingExperience,
  type StepFieldErrors,
  type TrainingStepAnswers,
} from '@/lib/onboarding-schema';
import { Button } from '@/shadcn/ui/button';
import type { UnitPreference } from '@/utils/units';

import { ExperienceField } from './experienceField';
import { LiftFields } from './liftFields';
import { ScheduleFields } from './scheduleFields';

type Props = {
  defaults: Partial<TrainingStepAnswers>;
  unit: UnitPreference;
  onBack: () => void;
  onNext: (answers: TrainingStepAnswers) => void;
};

type Experience = OnboardingExperience | '';

/**
 * - A beginner is never asked for a working weight, whatever a hidden field holds.
 * - Loads convert before they parse, so the 1000 lb bound stays in pounds.
 * - No five-pound snap here; the server's onboarding schema owns it.
 */
function validate(
  form: FormData,
  experience: Experience,
  unit: UnitPreference,
): { errors: StepFieldErrors } | { data: TrainingStepAnswers } {
  const beginner = experience === 'beginner';
  const lift = (name: string): number | undefined =>
    beginner ? undefined : optionalCanonicalWeight(form.get(name), unit);
  const result = TrainingStepSchema.safeParse({
    experience: form.get('experience'),
    squat_lb: lift('squat_lb'),
    bench_press_lb: lift('bench_press_lb'),
    deadlift_lb: lift('deadlift_lb'),
    overhead_press_lb: lift('overhead_press_lb'),
    days_per_week: optionalNumber(form.get('days_per_week')),
    rest_day: optionalNumber(form.get('rest_day')),
  });
  return result.success ? { data: result.data } : { errors: fieldErrors(result.error) };
}

/** The wizard's third step: how the client trains today. */
export function TrainingStep({ defaults, unit, onBack, onNext }: Props): JSX.Element {
  const [experience, setExperience] = useState<Experience>(defaults.experience ?? '');

  const [errors, formAction] = useActionState<StepFieldErrors | null, FormData>(
    (_previous, form) => {
      const result = validate(form, experience, unit);
      if ('errors' in result) return result.errors;
      onNext(result.data);
      return null;
    },
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">How do you train today?</h1>

      <ExperienceField
        defaultValue={defaults.experience ?? ''}
        error={errors?.experience}
        onChange={setExperience}
      />

      <LiftFields
        experience={experience}
        priorAnswers={defaults}
        unit={unit}
        errors={errors ?? {}}
      />

      <ScheduleFields priorAnswers={defaults} errors={errors ?? {}} />

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
