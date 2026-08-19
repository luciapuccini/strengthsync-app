import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Client } from '@/api/types';

import { useAppStore } from '@/store/useAppStore';

import { SignOutButton } from './signOutButton';

/**
 * Local state only, for now. The cases about the server call, its failure and
 * the in-flight guard are gone with the route they exercised
 * (`issues/011-amputate-old-auth.md`); nothing is asynchronous here any more.
 * `issues/013-web-app-universal-login.md` makes this call the SDK's logout,
 * which is what actually ends the session at Auth0.
 */

const UUID = '00000000-0000-4000-8000-000000000001';
const NOW = '2026-08-13T00:00:00.000Z';

const client: Client = {
  id: UUID,
  coach_id: UUID,
  display_name: 'Lucia',
  status: 'active',
  created_at: NOW,
  updated_at: NOW,
};

const button = () => screen.getByRole('button', { name: /sign out/i });

beforeEach(() => {
  useAppStore.setState({ sessionStatus: 'signed-in', sessionClient: client }, false);
  render(<SignOutButton />);
});

afterEach(() => {
  cleanup();
});

describe('sign-out button', () => {
  it('clears the session state', () => {
    fireEvent.click(button());

    expect(useAppStore.getState().sessionStatus).toBe('signed-out');
    expect(useAppStore.getState().sessionClient).toBeNull();
  });
});
