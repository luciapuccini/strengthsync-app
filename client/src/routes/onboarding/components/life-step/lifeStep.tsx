import { useActionState, useState } from 'react';
import type { JSX } from 'react';

import { generatePlan, submitOnboarding } from '@/api/client';
import { ApiClientError } from '@/api/errors';
import { invalidateCurrentWeek } from '@/api/weekResource';
import {
  LifeStepSchema,
  OnboardingAnswersSchema,
  fieldErrors,
  optionalNumber,
  optionalText,
  type LifeStepAnswers,
  type OnboardingActivity,
  type OnboardingAnswers,
  type OnboardingDraft,
  type StepFieldErrors,
} from '@/lib/onboarding-schema';
import { Button } from '@/shadcn/ui/button';
import { Spinner } from '@/shadcn/ui/spinner';

import { ActivitiesField } from './activitiesField';
import { LifeFields } from './lifeFields';

type Props = {
  priorAnswers: OnboardingDraft;
  onBack: () => void;
  onSubmitted: () => void;
};

type SubmitState = { errors: StepFieldErrors; error: string | null };

const initialState: SubmitState = { errors: {}, error: null };

type OptionalGoalFields = Pick<
  OnboardingAnswers,
  'body_fat_percent' | 'target_date' | 'target_weight_kg' | 'note'
>;
function optionalGoalFields(fields: OptionalGoalFields) {
  const { body_fat_percent, target_date, target_weight_kg, note } = fields;
  return {
    ...(body_fat_percent !== undefined ? { body_fat_percent } : {}),
    ...(target_date !== undefined ? { target_date } : {}),
    ...(target_weight_kg !== undefined ? { target_weight_kg } : {}),
    ...(note !== undefined ? { note } : {}),
  };
}

type OptionalTrainingFields = Pick<
  OnboardingAnswers,
  'squat_kg' | 'bench_press_kg' | 'deadlift_kg' | 'overhead_press_kg'
>;
function optionalTrainingFields(fields: OptionalTrainingFields) {
  const { squat_kg, bench_press_kg, deadlift_kg, overhead_press_kg } = fields;
  return {
    ...(squat_kg !== undefined ? { squat_kg } : {}),
    ...(bench_press_kg !== undefined ? { bench_press_kg } : {}),
    ...(deadlift_kg !== undefined ? { deadlift_kg } : {}),
    ...(overhead_press_kg !== undefined ? { overhead_press_kg } : {}),
  };
}

type OptionalLifeFields = Pick<
  OnboardingAnswers,
  'activities' | 'daily_activity_level' | 'eating_phase' | 'protein_target_g' | 'injury_note'
>;
function optionalLifeFields(fields: OptionalLifeFields) {
  const { activities, daily_activity_level, eating_phase, protein_target_g, injury_note } = fields;
  return {
    ...(activities !== undefined
      ? {
          activities: activities.map(({ name, sessions_per_week, note }) => ({
            name,
            sessions_per_week,
            ...(note !== undefined ? { note } : {}),
          })),
        }
      : {}),
    ...(daily_activity_level !== undefined ? { daily_activity_level } : {}),
    ...(eating_phase !== undefined ? { eating_phase } : {}),
    ...(protein_target_g !== undefined ? { protein_target_g } : {}),
    ...(injury_note !== undefined ? { injury_note } : {}),
  };
}

/**
 * The wire type has `exactOptionalPropertyTypes` on, so an optional key must
 * be entirely absent rather than present with value `undefined` — which is
 * exactly what zod's inferred optionals produce. Split by step to keep this
 * function's own complexity under the lint ceiling.
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
    activities,
    daily_activity_level,
    eating_phase,
    protein_target_g,
    injury_note,
    ...required
  } = answers;
  return {
    ...required,
    ...optionalGoalFields({ body_fat_percent, target_date, target_weight_kg, note }),
    ...optionalTrainingFields({ squat_kg, bench_press_kg, deadlift_kg, overhead_press_kg }),
    ...optionalLifeFields({
      activities,
      daily_activity_level,
      eating_phase,
      protein_target_g,
      injury_note,
    }),
  };
}

function validateStep(
  form: FormData,
  activities: OnboardingActivity[],
): { errors: StepFieldErrors } | { data: LifeStepAnswers } {
  const result = LifeStepSchema.safeParse({
    activities: activities.length > 0 ? activities : undefined,
    daily_activity_level: optionalText(form.get('daily_activity_level')),
    eating_phase: optionalText(form.get('eating_phase')),
    protein_target_g: optionalNumber(form.get('protein_target_g')),
    injury_note: optionalText(form.get('injury_note')),
  });
  return result.success ? { data: result.data } : { errors: fieldErrors(result.error) };
}

/**
 * The wizard's fourth and final step and its submit: everything around the
 * training that changes what the training should be, then the answers
 * accumulated across every step become the coaching profile and, in the same
 * submit, its first generated plan.
 */
export function LifeStep({ priorAnswers, onBack, onSubmitted }: Props): JSX.Element {
  const [activities, setActivities] = useState<OnboardingActivity[]>(priorAnswers.activities ?? []);

  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    async (_previous, form) => {
      const step = validateStep(form, activities);
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
      <h1 className="text-xl font-semibold">Anything else that shapes your training?</h1>

      <ActivitiesField activities={activities} onChange={setActivities} />

      <LifeFields defaults={priorAnswers} errors={state.errors} />

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
