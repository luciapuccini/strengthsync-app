import { useActionState, useRef, useState } from 'react';
import type { JSX } from 'react';

import { generatePlan, submitOnboarding } from '@/api/client';
import { ApiClientError } from '@/api/errors';
import type { PlanStreamEvent } from '@/api/types';
import { invalidateActivePlan } from '@/api/activePlanResource';
import { invalidateCurrentWeek } from '@/api/weekResource';
import {
  trackPlanGenerationFailed,
  trackPlanGenerationStarted,
  trackPlanGenerationSucceeded,
} from '@/lib/analytics';
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

import { ActivitiesField } from './activitiesField';
import { ComposingScreen, type ComposingHeader } from '../composing-screen/composingScreen';
import { LifeFields } from './lifeFields';

type Props = {
  priorAnswers: OnboardingDraft;
  onBack: () => void;
  onSubmitted: () => void;
};

type SubmitPayload = { kind: 'submit'; form: FormData } | { kind: 'retry' };
type SubmitState = { phase: 'form' | 'failed'; errors: StepFieldErrors };

const initialState: SubmitState = { phase: 'form', errors: {} };

type OptionalGoalFields = Pick<
  OnboardingAnswers,
  'body_fat_percent' | 'target_date' | 'target_weight_lb' | 'note'
>;
function optionalGoalFields(fields: OptionalGoalFields) {
  const { body_fat_percent, target_date, target_weight_lb, note } = fields;
  return {
    ...(body_fat_percent !== undefined ? { body_fat_percent } : {}),
    ...(target_date !== undefined ? { target_date } : {}),
    ...(target_weight_lb !== undefined ? { target_weight_lb } : {}),
    ...(note !== undefined ? { note } : {}),
  };
}

type OptionalTrainingFields = Pick<
  OnboardingAnswers,
  'squat_lb' | 'bench_press_lb' | 'deadlift_lb' | 'overhead_press_lb'
>;
function optionalTrainingFields(fields: OptionalTrainingFields) {
  const { squat_lb, bench_press_lb, deadlift_lb, overhead_press_lb } = fields;
  return {
    ...(squat_lb !== undefined ? { squat_lb } : {}),
    ...(bench_press_lb !== undefined ? { bench_press_lb } : {}),
    ...(deadlift_lb !== undefined ? { deadlift_lb } : {}),
    ...(overhead_press_lb !== undefined ? { overhead_press_lb } : {}),
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
    target_weight_lb,
    note,
    squat_lb,
    bench_press_lb,
    deadlift_lb,
    overhead_press_lb,
    activities,
    daily_activity_level,
    eating_phase,
    protein_target_g,
    injury_note,
    ...required
  } = answers;
  return {
    ...required,
    ...optionalGoalFields({ body_fat_percent, target_date, target_weight_lb, note }),
    ...optionalTrainingFields({ squat_lb, bench_press_lb, deadlift_lb, overhead_press_lb }),
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
 * The write, then the one model call: saving the profile only ever happens
 * once per visit to this step (`profileSaved`), so a retry after a
 * generation failure re-runs generation only, per the parent PRD.
 *
 * The model call now streams, so this drives the stream to its end rather than
 * awaiting a body, handing each event to the screen as it arrives. Only
 * `ready` means the plan was written; a stream that stops before it is a
 * failure, however tidily it ended.
 */
async function composePlan(
  answers: OnboardingAnswers,
  profileSaved: { current: boolean },
  onEvent: (event: PlanStreamEvent) => void,
): Promise<void> {
  if (!profileSaved.current) {
    await submitOnboarding(toWirePayload(answers));
    profileSaved.current = true;
  }
  trackPlanGenerationStarted();
  const startedAt = performance.now();
  try {
    let saved = false;
    for await (const event of generatePlan()) {
      saved ||= event.type === 'ready';
      onEvent(event);
    }
    if (!saved) {
      throw new ApiClientError(
        'server',
        0,
        'generation_incomplete',
        'generation ended before the plan was saved',
      );
    }
    trackPlanGenerationSucceeded(performance.now() - startedAt);
  } catch (error) {
    trackPlanGenerationFailed(performance.now() - startedAt);
    throw error;
  }
}

/**
 * The wizard's fourth and final step and its submit: everything around the
 * training that changes what the training should be, then the answers
 * accumulated across every step become the coaching profile and, in the same
 * submit, its first generated plan. `pending` from `useActionState` is still
 * the "in flight" signal the composing screen branches on; what a boolean
 * cannot carry is what the stream has said so far, so the header it announces
 * is held beside it.
 */
export function LifeStep({ priorAnswers, onBack, onSubmitted }: Props): JSX.Element {
  const [activities, setActivities] = useState<OnboardingActivity[]>(priorAnswers.activities ?? []);
  const [header, setHeader] = useState<ComposingHeader | null>(null);
  const validAnswers = useRef<OnboardingAnswers | null>(null);
  const profileSaved = useRef(false);

  const [state, dispatch, pending] = useActionState<SubmitState, SubmitPayload>(
    async (_previous, payload) => {
      if (payload.kind === 'submit') {
        const step = validateStep(payload.form, activities);
        if ('errors' in step) return { phase: 'form', errors: step.errors };

        const full = OnboardingAnswersSchema.safeParse({ ...priorAnswers, ...step.data });
        if (!full.success) return { phase: 'failed', errors: {} };
        validAnswers.current = full.data;
      }

      if (!validAnswers.current) return { phase: 'failed', errors: {} };

      // A retry starts from nothing: the previous attempt's header described a
      // candidate that was never saved, and this call produces a different plan.
      setHeader(null);

      try {
        await composePlan(validAnswers.current, profileSaved, (event) => {
          if (event.type === 'meta')
            setHeader({ label: event.label, totalWeeks: event.total_weeks });
        });
        invalidateCurrentWeek();
        invalidateActivePlan();
        onSubmitted();
        return initialState;
      } catch {
        return { phase: 'failed', errors: {} };
      }
    },
    initialState,
  );

  if (pending || state.phase === 'failed') {
    return (
      <ComposingScreen
        status={pending ? 'pending' : 'failed'}
        header={header}
        onRetry={() => dispatch({ kind: 'retry' })}
      />
    );
  }

  return (
    <form action={(form) => dispatch({ kind: 'submit', form })} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Anything else that shapes your training?</h1>

      <ActivitiesField activities={activities} onChange={setActivities} />

      <LifeFields defaults={priorAnswers} errors={state.errors} />

      <div className="flex gap-3">
        <Button type="button" variant="outline" size="xl" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" size="xl" className="flex-1">
          Finish
        </Button>
      </div>
    </form>
  );
}
