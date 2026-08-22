import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Client } from '@/api/types';

import { useAppStore } from '@/store/useAppStore';

import { SignOutButton } from './signOutButton';

/**
 * Leaving has to happen at both ends. Clearing the store alone would leave the
 * Auth0 session intact, and the next visit would be signed straight back in by
 * silent authentication — a sign-out that survives exactly until the next page
 * load is worse than none, because it looks like one.
 */

const { useAuth0, logout } = vi.hoisted(() => ({
  useAuth0: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@auth0/auth0-react', () => ({ useAuth0 }));

const UUID = '00000000-0000-4000-8000-000000000001';
const NOW = '2026-08-13T00:00:00.000Z';

const client: Client = {
  id: UUID,
  coach_id: UUID,
  display_name: 'Lucia',
  status: 'active',
  unit_preference: 'imperial',
  created_at: NOW,
  updated_at: NOW,
};

const button = () => screen.getByRole('button', { name: /sign out/i });

beforeEach(() => {
  useAuth0.mockReturnValue({ logout });
  logout.mockResolvedValue(undefined);
  useAppStore.setState({ sessionStatus: 'signed-in', sessionClient: client }, false);
  render(<SignOutButton />);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('sign-out button', () => {
  it('clears the session state', () => {
    fireEvent.click(button());

    expect(useAppStore.getState().sessionStatus).toBe('signed-out');
    expect(useAppStore.getState().sessionClient).toBeNull();
  });

  it('ends the session at the provider, returning to the app', () => {
    fireEvent.click(button());

    expect(logout).toHaveBeenCalledWith({
      logoutParams: { returnTo: window.location.origin },
    });
  });
});
