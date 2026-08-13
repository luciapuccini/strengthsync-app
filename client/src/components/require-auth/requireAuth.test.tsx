import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import type { SessionStatus } from '@/store/slices/sessionSlice';

import { useAppStore } from '@/store/useAppStore';

import { RequireAuth } from './requireAuth';

function renderGuarded(status: SessionStatus): HTMLElement {
  useAppStore.setState({ sessionStatus: status, sessionClient: null }, false);
  return render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route path="/sign-in" element={<p>sign in screen</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/private" element={<p>private screen</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  ).container;
}

afterEach(cleanup);

describe('RequireAuth', () => {
  it('waits rather than redirecting while the session is still resolving', () => {
    const container = renderGuarded('loading');

    expect(screen.queryByText('private screen')).toBeNull();
    expect(screen.queryByText('sign in screen')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('sends a signed-out athlete to sign-in', () => {
    renderGuarded('signed-out');

    expect(screen.getByText('sign in screen')).toBeInTheDocument();
  });

  it('renders the private tree when signed in', () => {
    renderGuarded('signed-in');

    expect(screen.getByText('private screen')).toBeInTheDocument();
  });

  // The unauthorized handler clears the session; this is the other half of that
  // contract — the athlete is returned to sign-in from wherever they were.
  it('redirects as soon as a signed-in session is cleared mid-visit', () => {
    renderGuarded('signed-in');

    act(() => {
      useAppStore.getState().signOutSession();
    });

    expect(screen.getByText('sign in screen')).toBeInTheDocument();
  });
});
