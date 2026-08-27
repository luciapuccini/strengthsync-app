import { use, useReducer } from 'react';
import type { JSX } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { activePlanResource } from '@/api/activePlanResource';
import { UnitToggle } from '@/components/unit-toggle/unitToggle';
import { trackOnboardingStepCompleted } from '@/lib/analytics';
import { useAppStore } from '@/store/useAppStore';
import type { UnitPreference } from '@/utils/units';

import { GoalStep } from './components/goal-step/goalStep';
import { LifeStep } from './components/life-step/lifeStep';
import { OnboardingLayout } from './components/onboarding-layout/onboardingLayout';
import { PersonalStep } from './components/personal-step/personalStep';
import { TrainingStep } from './components/training-step/trainingStep';
import { ONBOARDING_STEPS, initialOnboardingState, onboardingReducer } from './onboardingReducer';

/**
 * The questionnaire that turns a new client into a coaching profile. Step
 * state is a reducer local to this route — no store slice, no draft
 * persistence, so an abandoned wizard leaves nothing behind to clean up.
 *
 * Redirects to the tracker when an active plan already exists, so a client
 * cannot run the questionnaire a second time from the browser — closing the
 * same path the generate route already refuses server-side.
 */
export function OnboardingPage(): JSX.Element {
  const activePlan = use(activePlanResource());
  const [state, dispatch] = useReducer(onboardingReducer, initialOnboardingState);
  const setUnitPreference = useAppStore((store) => store.setUnitPreference);
  const navigate = useNavigate();
  const stepNumber = ONBOARDING_STEPS.indexOf(state.step) + 1;

  /**
   * The wizard switches units first and persists second, and swallows a failed
   * write on purpose: the answers submit as canonical imperial whatever the
   * stored preference says, so a failure costs nothing but the display setting,
   * which the Account page can fix. Interrupting the questionnaire with an
   * error about it would cost more.
   */
  function pickUnit(unit: UnitPreference): void {
    dispatch({ type: 'set-unit', unit });
    void setUnitPreference(unit).catch(() => {});
  }

  if (activePlan !== null) {
    return <Navigate to="/track" replace />;
  }

  return (
    <OnboardingLayout current={stepNumber} total={ONBOARDING_STEPS.length}>
      {state.step === 'personal' && (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Answer in the units you think in. You will not be asked again.
            </p>
            <UnitToggle value={state.unit} onChange={pickUnit} />
          </div>
          <PersonalStep
            defaults={state.answers}
            unit={state.unit}
            onNext={(answers) => {
              trackOnboardingStepCompleted('personal');
              dispatch({ type: 'advance', answers });
            }}
          />
        </>
      )}

      {state.step === 'goal' && (
        <GoalStep
          defaults={state.answers}
          unit={state.unit}
          onBack={() => dispatch({ type: 'back' })}
          onNext={(answers) => {
            trackOnboardingStepCompleted('goal');
            dispatch({ type: 'advance', answers });
          }}
        />
      )}

      {state.step === 'training' && (
        <TrainingStep
          defaults={state.answers}
          unit={state.unit}
          onBack={() => dispatch({ type: 'back' })}
          onNext={(answers) => {
            trackOnboardingStepCompleted('training');
            dispatch({ type: 'advance', answers });
          }}
        />
      )}

      {state.step === 'life' && (
        <LifeStep
          priorAnswers={state.answers}
          onBack={() => dispatch({ type: 'back' })}
          onSubmitted={() => {
            trackOnboardingStepCompleted('life');
            void navigate('/track', { replace: true });
          }}
        />
      )}
    </OnboardingLayout>
  );
}
