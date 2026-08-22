import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { activePlanResource, updateUnitPreference } = vi.hoisted(() => ({
  activePlanResource: vi.fn(),
  updateUnitPreference: vi.fn(),
}));

vi.mock('@/api/activePlanResource', () => ({
  activePlanResource,
  invalidateActivePlan: vi.fn(),
}));

// Only the preference write is stubbed; everything else the wizard reaches for
// stays real, so a step that starts calling something new fails loudly here
// rather than silently resolving to a mock.
vi.mock('@/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client')>()),
  updateUnitPreference,
}));

import { OnboardingPage } from './onboardingPage';

async function renderOnboarding(): Promise<void> {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/track" element={<p>tracker screen</p>} />
          </Routes>
        </Suspense>
      </MemoryRouter>,
    );
  });
}

function type(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** The whole of step one, answered in centimetres and kilograms. */
async function answerPersonalStepInMetric(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Kilograms (kg)' }));
  });
  type('Sex', 'female');
  type('Age', '34');
  type('Height (cm)', '170');
  type('Current weight (kg)', '65');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// The destructive path this slice closes in the browser as well as in the
// handler: `issues/007-entry-points-and-guards.md`.
describe('OnboardingPage', () => {
  it('redirects to the tracker without rendering the questionnaire when a plan is already active', async () => {
    activePlanResource.mockReturnValue(Promise.resolve({ id: 'plan-1', status: 'active' }));
    await renderOnboarding();

    expect(screen.getByText('tracker screen')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /who are you/i })).toBeNull();
  });

  it('renders the questionnaire from its first step when there is no active plan', async () => {
    activePlanResource.mockReturnValue(Promise.resolve(null));
    await renderOnboarding();

    expect(screen.getByRole('heading', { name: /who are you/i })).toBeInTheDocument();
  });
});

// What a metric athlete types has to come back unchanged, even though what is
// stored between the two is pounds and inches.
describe('OnboardingPage in metric', () => {
  it('re-shows the centimetres and kilograms that were typed after stepping back', async () => {
    activePlanResource.mockReturnValue(Promise.resolve(null));
    updateUnitPreference.mockResolvedValue({ id: 'client-1', unit_preference: 'metric' });
    await renderOnboarding();

    await answerPersonalStepInMetric();
    expect(screen.getByRole('heading', { name: /your goal/i })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    });

    expect(screen.getByLabelText('Height (cm)')).toHaveValue(170);
    expect(screen.getByLabelText('Current weight (kg)')).toHaveValue(65);
  });

  it('carries the unit into the later steps and converts a typed lift to canonical pounds', async () => {
    activePlanResource.mockReturnValue(Promise.resolve(null));
    updateUnitPreference.mockResolvedValue({ id: 'client-1', unit_preference: 'metric' });
    await renderOnboarding();

    await answerPersonalStepInMetric();
    type('Primary goal', 'get_stronger');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    });

    type('Training experience', 'intermediate');
    type("Squat (kg, optional — skip if you don't train it)", '100');
    type('Training days per week', '4');
    type('Usual rest day', '7');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    });
    expect(screen.getByRole('heading', { name: /anything else/i })).toBeInTheDocument();

    // 100 kg is 220 lb, and 220 lb reads back as the 100 kg that was typed:
    // the five-pound snap the server applies to it is invisible.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    });
    expect(screen.getByLabelText("Squat (kg, optional — skip if you don't train it)")).toHaveValue(
      100,
    );
  });

  it('clears a weight already typed rather than rereading it as the other unit', async () => {
    activePlanResource.mockReturnValue(Promise.resolve(null));
    updateUnitPreference.mockResolvedValue({ id: 'client-1', unit_preference: 'metric' });
    await renderOnboarding();

    type('Current weight (lb)', '160');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Kilograms (kg)' }));
    });

    expect(screen.getByLabelText('Current weight (kg)')).toHaveValue(null);
  });

  it('keeps the questionnaire in the chosen unit when the preference write fails', async () => {
    activePlanResource.mockReturnValue(Promise.resolve(null));
    updateUnitPreference.mockRejectedValue(new Error('offline'));
    await renderOnboarding();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Kilograms (kg)' }));
    });

    expect(screen.getByLabelText('Height (cm)')).toBeInTheDocument();
    expect(screen.getByLabelText('Current weight (kg)')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
