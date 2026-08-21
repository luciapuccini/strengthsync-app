import { useActionState, useState } from 'react';
import type { JSX } from 'react';

import {
  TrainingStepSchema,
  fieldErrors,
  optionalNumber,
  type OnboardingExperience,
  type StepFieldErrors,
  type TrainingStepAnswers,
} from '@/lib/onboarding-schema';
import { Button } from '@/shadcn/ui/button';

import { ExperienceField } from './experienceField';
import { LiftFields } from './liftFields';
import { ScheduleFields } from './scheduleFields';

type Props = {
  defaults: Partial<TrainingStepAnswers>;
  onBack: () => void;
  onNext: (answers: TrainingStepAnswers) => void;
};

type Experience = OnboardingExperience | '';

/** A beginner is never asked for a working weight, whatever a hidden field holds. */
function validate(
  form: FormData,
  experience: Experience,
): { errors: StepFieldErrors } | { data: TrainingStepAnswers } {
  const beginner = experience === 'beginner';
  const result = TrainingStepSchema.safeParse({
    experience: form.get('experience'),
    squat_lb: beginner ? undefined : optionalNumber(form.get('squat_lb')),
    bench_press_lb: beginner ? undefined : optionalNumber(form.get('bench_press_lb')),
    deadlift_lb: beginner ? undefined : optionalNumber(form.get('deadlift_lb')),
    overhead_press_lb: beginner ? undefined : optionalNumber(form.get('overhead_press_lb')),
    days_per_week: optionalNumber(form.get('days_per_week')),
    rest_day: optionalNumber(form.get('rest_day')),
  });
  return result.success ? { data: result.data } : { errors: fieldErrors(result.error) };
}

/** The wizard's third step: how the client trains today. */
export function TrainingStep({ defaults, onBack, onNext }: Props): JSX.Element {
  const [experience, setExperience] = useState<Experience>(defaults.experience ?? '');

  const [errors, formAction] = useActionState<StepFieldErrors | null, FormData>(
    (_previous, form) => {
      const result = validate(form, experience);
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

      <LiftFields experience={experience} priorAnswers={defaults} errors={errors ?? {}} />

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
