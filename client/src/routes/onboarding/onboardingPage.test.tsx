import { act, cleanup, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { activePlanResource } = vi.hoisted(() => ({ activePlanResource: vi.fn() }));

vi.mock('@/api/activePlanResource', () => ({
  activePlanResource,
  invalidateActivePlan: vi.fn(),
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
