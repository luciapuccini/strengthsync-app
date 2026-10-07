import { act, cleanup, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Client, Plan } from '@/api/types';

const { currentWeekResource, invalidateCurrentWeek } = vi.hoisted(() => ({
  currentWeekResource: vi.fn(),
  invalidateCurrentWeek: vi.fn(),
}));

vi.mock('@/api/weekResource', () => ({ currentWeekResource, invalidateCurrentWeek }));

import { useAppStore } from '@/store/useAppStore';

import { TrackerPage } from './trackerPage';

const UUID = '00000000-0000-4000-8000-000000000010';
const NOW = '2026-08-13T00:00:00.000Z';

const client: Client = {
  id: UUID,
  coach_id: UUID,
  display_name: 'Ana',
  status: 'active',
  unit_preference: 'imperial',
  created_at: NOW,
  updated_at: NOW,
};

const plan: Plan = {
  id: UUID,
  client_id: UUID,
  label: 'Strength block',
  status: 'active',
  total_weeks: 8,
  week_template: [],
  rationale: null,
  activated_at: NOW,
  created_at: NOW,
  updated_at: NOW,
};

beforeEach(() => {
  useAppStore.setState({ client: null, plan: null, week: null }, false);
  currentWeekResource.mockReturnValue(Promise.resolve({ client, plan: null, week: null }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderTracker(): Promise<void> {
  await act(async () => {
    render(
      <MemoryRouter>
        <Suspense fallback={null}>
          <TrackerPage />
        </Suspense>
      </MemoryRouter>,
    );
  });
}

describe('the tracker with no current week', () => {
  it('tells the athlete their account is set up and that no plan exists yet', async () => {
    await renderTracker();

    expect(screen.getByRole('heading', { name: /you're all set up/i })).toBeInTheDocument();
    expect(screen.getByText(/no training plan on your account yet/i)).toBeInTheDocument();
  });

  it('claims no outage and nothing unavailable', async () => {
    await renderTracker();

    expect(screen.queryByText(/unavailable/i)).toBeNull();
    expect(screen.queryByText(/temporarily/i)).toBeNull();
    expect(screen.queryByText(/check back/i)).toBeNull();
  });

  it('invites the athlete into onboarding rather than leaving them with nothing to do', async () => {
    await renderTracker();

    const link = screen.getByRole('link', { name: /build your plan/i });
    expect(link).toHaveAttribute('href', '/onboarding');
  });
});

describe('the tracker after a week was completed and the next one starts later', () => {
  beforeEach(() => {
    currentWeekResource.mockReturnValue(
      Promise.resolve({ client, plan, week: null, nextWeekStart: '2026-10-05' }),
    );
  });

  it('says the week is complete and when the next one starts', async () => {
    await renderTracker();

    expect(screen.getByRole('heading', { name: /week complete/i })).toBeInTheDocument();
    expect(
      screen.getByText('Your next week starts on 05/10/2026. Check back then.'),
    ).toBeInTheDocument();
  });

  it('offers no way to complete the week again', async () => {
    await renderTracker();

    expect(screen.getByRole('button', { name: /complete week/i })).toBeDisabled();
  });
});
