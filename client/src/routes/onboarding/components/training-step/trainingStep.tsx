import { useActionState, useState } from 'react';
import type { JSX } from 'react';

import { generatePlan, submitOnboarding } from '@/api/client';
import { ApiClientError } from '@/api/errors';
import { invalidateCurrentWeek } from '@/api/weekResource';
import {
  OnboardingAnswersSchema,
  TrainingStepSchema,
  fieldErrors,
  optionalNumber,
  type OnboardingAnswers,
  type OnboardingDraft,
  type OnboardingExperience,
  type StepFieldErrors,
  type TrainingStepAnswers,
} from '@/lib/onboarding-schema';
import { Button } from '@/shadcn/ui/button';
import { Spinner } from '@/shadcn/ui/spinner';

import { ExperienceField } from './experienceField';
import { LiftFields } from './liftFields';
import { ScheduleFields } from './scheduleFields';

type Props = {
  priorAnswers: OnboardingDraft;
  onBack: () => void;
  onSubmitted: () => void;
};

type SubmitState = { errors: StepFieldErrors; error: string | null };

const initialState: SubmitState = { errors: {}, error: null };

type Experience = OnboardingExperience | '';

/**
 * The wire type has `exactOptionalPropertyTypes` on, so an optional key must
 * be entirely absent rather than present with value `undefined` — which is
 * exactly what zod's inferred optionals produce.
 */
function toWirePayload(answers: OnboardingAnswers) {
  const {
    body_fat_percent,
    target_date,
    target_weight_kg,
    note,
    squat_kg,
    bench_press_kg,
    deadlift_kg,
    overhead_press_kg,
    ...required
  } = answers;
  return {
    ...required,
    ...(body_fat_percent !== undefined ? { body_fat_percent } : {}),
    ...(target_date !== undefined ? { target_date } : {}),
    ...(target_weight_kg !== undefined ? { target_weight_kg } : {}),
    ...(note !== undefined ? { note } : {}),
    ...(squat_kg !== undefined ? { squat_kg } : {}),
    ...(bench_press_kg !== undefined ? { bench_press_kg } : {}),
    ...(deadlift_kg !== undefined ? { deadlift_kg } : {}),
    ...(overhead_press_kg !== undefined ? { overhead_press_kg } : {}),
  };
}

/** A beginner is never asked for a working weight, whatever a hidden field holds. */
function validateStep(
  form: FormData,
  experience: Experience,
): { errors: StepFieldErrors } | { data: TrainingStepAnswers } {
  const beginner = experience === 'beginner';
  const result = TrainingStepSchema.safeParse({
    experience: form.get('experience'),
    squat_kg: beginner ? undefined : optionalNumber(form.get('squat_kg')),
    bench_press_kg: beginner ? undefined : optionalNumber(form.get('bench_press_kg')),
    deadlift_kg: beginner ? undefined : optionalNumber(form.get('deadlift_kg')),
    overhead_press_kg: beginner ? undefined : optionalNumber(form.get('overhead_press_kg')),
    days_per_week: optionalNumber(form.get('days_per_week')),
    rest_day: optionalNumber(form.get('rest_day')),
  });
  return result.success ? { data: result.data } : { errors: fieldErrors(result.error) };
}

/**
 * The wizard's final step and its submit: how the client trains today, then
 * the answers accumulated across every step become the coaching profile and,
 * in the same submit, its first generated plan.
 */
export function TrainingStep({ priorAnswers, onBack, onSubmitted }: Props): JSX.Element {
  const [experience, setExperience] = useState<Experience>(priorAnswers.experience ?? '');

  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    async (_previous, form) => {
      const step = validateStep(form, experience);
      if ('errors' in step) return { errors: step.errors, error: null };

      const full = OnboardingAnswersSchema.safeParse({ ...priorAnswers, ...step.data });
      if (!full.success) {
        // The prior steps already validated their part of this data; reaching
        // here means a step was skipped, which the wizard's own UI never does.
        return { errors: {}, error: 'Something went wrong. Please restart onboarding.' };
      }

      try {
        await submitOnboarding(toWirePayload(full.data));
        await generatePlan();
        invalidateCurrentWeek();
        onSubmitted();
        return initialState;
      } catch (err) {
        return {
          errors: {},
          error:
            err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.',
        };
      }
    },
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">How do you train today?</h1>

      <ExperienceField
        defaultValue={priorAnswers.experience ?? ''}
        error={state.errors.experience}
        onChange={setExperience}
      />

      <LiftFields experience={experience} priorAnswers={priorAnswers} errors={state.errors} />

      <ScheduleFields priorAnswers={priorAnswers} errors={state.errors} />

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" size="xl" onClick={onBack} disabled={pending}>
          Back
        </Button>
        <Button type="submit" size="xl" className="flex-1" disabled={pending}>
          {pending && <Spinner />}
          {pending ? 'Building your plan…' : 'Finish'}
        </Button>
      </div>
    </form>
  );
}
