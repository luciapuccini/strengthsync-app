import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import type { SessionStatus } from '@/store/slices/sessionSlice';

import { useAppStore } from '@/store/useAppStore';

import { RootRedirect } from './rootRedirect';

function renderRoot(status: SessionStatus): HTMLElement {
  useAppStore.setState({ sessionStatus: status, sessionClient: null }, false);
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/track" element={<p>tracker screen</p>} />
        <Route path="/sign-in" element={<p>sign in screen</p>} />
      </Routes>
    </MemoryRouter>,
  ).container;
}

afterEach(cleanup);

describe('RootRedirect', () => {
  it('waits rather than guessing while the session is still resolving', () => {
    const container = renderRoot('loading');

    expect(screen.queryByText('tracker screen')).toBeNull();
    expect(screen.queryByText('sign in screen')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  // The signed-in client is deliberately not read: the tracker URL no longer
  // carries an id, so the root only has to know that somebody is signed in.
  it('lands a signed-in visitor on the tracker, without needing their id', () => {
    renderRoot('signed-in');

    expect(screen.getByText('tracker screen')).toBeInTheDocument();
  });

  it('lands a signed-out visitor on sign-in', () => {
    renderRoot('signed-out');

    expect(screen.getByText('sign in screen')).toBeInTheDocument();
  });
});
