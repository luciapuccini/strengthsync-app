import type { OnboardingDraft } from '@/lib/onboarding-schema';
import type { UnitPreference } from '@/utils/units';

/**
 * Step state for the onboarding wizard, local to the route — no store slice,
 * no draft persistence.
 */
export const ONBOARDING_STEPS = ['personal', 'goal', 'training', 'life'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingWizardState = {
  step: OnboardingStep;
  answers: OnboardingDraft;
  /**
   * The units the questionnaire asks in. Wizard state, not the store's
   * preference: the form has to keep working in the chosen unit even when the
   * write that persists it fails, and `answers` stays canonical imperial either
   * way.
   */
  unit: UnitPreference;
};

export const initialOnboardingState: OnboardingWizardState = {
  step: 'personal',
  answers: {},
  unit: 'imperial',
};

export type OnboardingAction =
  | { type: 'advance'; answers: OnboardingDraft }
  | { type: 'back' }
  | { type: 'set-unit'; unit: UnitPreference };

export function onboardingReducer(
  state: OnboardingWizardState,
  action: OnboardingAction,
): OnboardingWizardState {
  const index = ONBOARDING_STEPS.indexOf(state.step);
  switch (action.type) {
    case 'advance': {
      const answers = { ...state.answers, ...action.answers };
      const next = ONBOARDING_STEPS[index + 1];
      return next ? { ...state, step: next, answers } : { ...state, answers };
    }
    case 'back': {
      const previous = ONBOARDING_STEPS[index - 1];
      return previous ? { ...state, step: previous } : state;
    }
    case 'set-unit':
      return { ...state, unit: action.unit };
  }
}
