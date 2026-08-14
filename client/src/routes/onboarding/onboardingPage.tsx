import { useReducer } from 'react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';

import { GoalStep } from './components/goal-step/goalStep';
import { OnboardingProgress } from './components/onboarding-progress/onboardingProgress';
import { PersonalStep } from './components/personal-step/personalStep';
import { TrainingStep } from './components/training-step/trainingStep';
import { ONBOARDING_STEPS, initialOnboardingState, onboardingReducer } from './onboardingReducer';

/**
 * The questionnaire that turns a new client into a coaching profile. Step
 * state is a reducer local to this route — no store slice, no draft
 * persistence, so an abandoned wizard leaves nothing behind to clean up.
 */
export function OnboardingPage(): JSX.Element {
  const [state, dispatch] = useReducer(onboardingReducer, initialOnboardingState);
  const navigate = useNavigate();
  const stepNumber = ONBOARDING_STEPS.indexOf(state.step) + 1;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <OnboardingProgress current={stepNumber} total={ONBOARDING_STEPS.length} />

      {state.step === 'personal' && (
        <PersonalStep
          defaults={state.answers}
          onNext={(answers) => dispatch({ type: 'advance', answers })}
        />
      )}

      {state.step === 'goal' && (
        <GoalStep
          defaults={state.answers}
          onBack={() => dispatch({ type: 'back' })}
          onNext={(answers) => dispatch({ type: 'advance', answers })}
        />
      )}

      {state.step === 'training' && (
        <TrainingStep
          priorAnswers={state.answers}
          onBack={() => dispatch({ type: 'back' })}
          onSubmitted={() => void navigate('/track', { replace: true })}
        />
      )}
    </div>
  );
}
