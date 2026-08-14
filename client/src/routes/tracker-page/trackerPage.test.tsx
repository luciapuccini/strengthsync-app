import { act, cleanup, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Client } from '@/api/types';

const { currentWeekResource, invalidateCurrentWeek } = vi.hoisted(() => ({
  currentWeekResource: vi.fn(),
  invalidateCurrentWeek: vi.fn(),
}));

// The tracker slice imports `invalidateCurrentWeek` from the same module, so the
// mock has to carry it too or hydrating the store here would fail.
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
  created_at: NOW,
  updated_at: NOW,
};

beforeEach(() => {
  useAppStore.setState({ client: null, plan: null, week: null }, false);
  // One promise object across every render: `use` re-reads it after the
  // suspense, and the page's hydration guard compares the resolved value by
  // reference.
  currentWeekResource.mockReturnValue(Promise.resolve({ client, plan: null, week: null }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/**
 * `render` wraps its work in a synchronous `act`, and a component that suspends
 * inside one never has its retry flushed — the page stays on the fallback and
 * every query finds an empty body. Awaiting an async `act` around the render is
 * what lets the resource resolve and the retry commit.
 */
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

// The branch a newly registered athlete lands on, which had no coverage before
// `issues/auth/014`.
describe('the tracker with no current week', () => {
  it('tells the athlete their account is set up and that no plan exists yet', async () => {
    await renderTracker();

    expect(screen.getByRole('heading', { name: /you're all set up/i })).toBeInTheDocument();
    expect(screen.getByText(/no training plan on your account yet/i)).toBeInTheDocument();
  });

  // The claim this slice exists to remove. Pinned negatively because the old
  // copy was not wrong about the state — it was wrong about the cause.
  it('claims no outage and nothing unavailable', async () => {
    await renderTracker();

    expect(screen.queryByText(/unavailable/i)).toBeNull();
    expect(screen.queryByText(/temporarily/i)).toBeNull();
    expect(screen.queryByText(/check back/i)).toBeNull();
  });

  // The dead end this slice closes: `issues/007-entry-points-and-guards.md`.
  it('invites the athlete into onboarding rather than leaving them with nothing to do', async () => {
    await renderTracker();

    const link = screen.getByRole('link', { name: /build your plan/i });
    expect(link).toHaveAttribute('href', '/onboarding');
  });
});
