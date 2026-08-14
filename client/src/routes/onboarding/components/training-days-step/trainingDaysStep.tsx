import { useActionState } from 'react';
import type { JSX } from 'react';

import { generatePlan, submitOnboarding } from '@/api/client';
import { ApiClientError } from '@/api/errors';
import { invalidateCurrentWeek } from '@/api/weekResource';
import {
  OnboardingAnswersSchema,
  TrainingDaysStepSchema,
  optionalNumber,
  type OnboardingAnswers,
  type OnboardingDraft,
} from '@/lib/onboarding-schema';
import { Button } from '@/shadcn/ui/button';
import { Input } from '@/shadcn/ui/input';
import { Spinner } from '@/shadcn/ui/spinner';

import { OnboardingField } from '../onboarding-field/onboardingField';

type Props = {
  priorAnswers: OnboardingDraft;
  onBack: () => void;
  onSubmitted: () => void;
};

type SubmitState = { error: string | null; fieldError: string | null };

const initialState: SubmitState = { error: null, fieldError: null };

/**
 * The wire type has `exactOptionalPropertyTypes` on, so an optional key must
 * be entirely absent rather than present with value `undefined` — which is
 * exactly what zod's inferred optionals produce.
 */
function toWirePayload(answers: OnboardingAnswers) {
  const { body_fat_percent, target_date, target_weight_kg, note, ...required } = answers;
  return {
    ...required,
    ...(body_fat_percent !== undefined ? { body_fat_percent } : {}),
    ...(target_date !== undefined ? { target_date } : {}),
    ...(target_weight_kg !== undefined ? { target_weight_kg } : {}),
    ...(note !== undefined ? { note } : {}),
  };
}

/**
 * The wizard's final step and its submit: how many days a week the client can
 * train, then the answers accumulated across every step become the coaching
 * profile and, in the same submit, its first generated plan. Its home moves
 * in `issues/004-training-step.md`.
 */
export function TrainingDaysStep({ priorAnswers, onBack, onSubmitted }: Props): JSX.Element {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    async (_previous, form) => {
      const days = TrainingDaysStepSchema.safeParse({
        days_per_week: optionalNumber(form.get('days_per_week')),
      });
      if (!days.success) {
        return { error: null, fieldError: days.error.issues[0]?.message ?? 'Invalid answer' };
      }

      const full = OnboardingAnswersSchema.safeParse({ ...priorAnswers, ...days.data });
      if (!full.success) {
        // The prior steps already validated their part of this data; reaching
        // here means a step was skipped, which the wizard's own UI never does.
        return { error: 'Something went wrong. Please restart onboarding.', fieldError: null };
      }

      try {
        await submitOnboarding(toWirePayload(full.data));
        await generatePlan();
        invalidateCurrentWeek();
        onSubmitted();
        return initialState;
      } catch (err) {
        return {
          error:
            err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.',
          fieldError: null,
        };
      }
    },
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">How many days a week can you train?</h1>

      <OnboardingField
        id="onboarding-days-per-week"
        label="Training days per week"
        error={state.fieldError ?? undefined}
      >
        <Input
          id="onboarding-days-per-week"
          name="days_per_week"
          type="number"
          inputMode="numeric"
          min={1}
          max={7}
          defaultValue={priorAnswers.days_per_week}
          required
        />
      </OnboardingField>

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
