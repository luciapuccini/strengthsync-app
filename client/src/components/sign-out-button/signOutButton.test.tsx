import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Client } from '@/api/types';

import { ApiClientError } from '@/api/errors';

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock('@/api/client', () => ({ signOut }));

import { useAppStore } from '@/store/useAppStore';

import { SignOutButton } from './signOutButton';

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
  vi.clearAllMocks();
});

describe('sign-out button', () => {
  it('clears the cookie server-side and then the session state', async () => {
    signOut.mockResolvedValue(undefined);
    fireEvent.click(button());

    expect(signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(useAppStore.getState().sessionStatus).toBe('signed-out'));
    expect(useAppStore.getState().sessionClient).toBeNull();
  });

  it('still signs out locally when the server call fails', async () => {
    signOut.mockRejectedValue(new ApiClientError('network', 0, 'network_error', 'offline'));
    fireEvent.click(button());

    await waitFor(() => expect(useAppStore.getState().sessionStatus).toBe('signed-out'));
  });

  it('refuses a second press while the first is in flight', async () => {
    signOut.mockReturnValue(new Promise<void>(() => {}));
    fireEvent.click(button());

    await waitFor(() => expect(button()).toBeDisabled());
    fireEvent.click(button());
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
