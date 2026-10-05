import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Client } from '@/api/types';

import { useAppStore } from '../useAppStore';

const { getMe, identifyClient } = vi.hoisted(() => ({
  getMe: vi.fn(),
  identifyClient: vi.fn(),
}));

vi.mock('@/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client')>()),
  getMe,
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  identifyClient,
}));

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

beforeEach(() => {
  useAppStore.setState({ sessionStatus: 'loading', sessionClient: null }, false);
  getMe.mockResolvedValue(client);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('sessionSlice', () => {
  it('starts out loading, with nobody signed in', () => {
    expect(useAppStore.getState().sessionStatus).toBe('loading');
    expect(useAppStore.getState().sessionClient).toBeNull();
  });

  it('stays loading while the provider is still deciding', async () => {
    await useAppStore.getState().resolveSession({ isLoading: true, isAuthenticated: false });

    expect(useAppStore.getState().sessionStatus).toBe('loading');
  });

  it('settles on signed-out when the provider has nobody', async () => {
    await useAppStore.getState().resolveSession({ isLoading: false, isAuthenticated: false });

    expect(useAppStore.getState().sessionStatus).toBe('signed-out');
    expect(useAppStore.getState().sessionClient).toBeNull();
  });

  it('reads the athlete and identifies them once the provider is satisfied', async () => {
    await useAppStore.getState().resolveSession({ isLoading: false, isAuthenticated: true });

    expect(getMe).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().sessionStatus).toBe('signed-in');
    expect(useAppStore.getState().sessionClient).toEqual(client);
    expect(identifyClient).toHaveBeenCalledWith(UUID);
  });

  it('does not sign anybody in when the athlete cannot be read', async () => {
    getMe.mockRejectedValue(new Error('unauthorized'));

    await useAppStore.getState().resolveSession({ isLoading: false, isAuthenticated: true });

    expect(useAppStore.getState().sessionStatus).toBe('signed-out');
    expect(useAppStore.getState().sessionClient).toBeNull();
    expect(identifyClient).not.toHaveBeenCalled();
  });

  it('clears the client on sign-out', async () => {
    await useAppStore.getState().resolveSession({ isLoading: false, isAuthenticated: true });
    useAppStore.getState().signOutSession();

    expect(useAppStore.getState().sessionStatus).toBe('signed-out');
    expect(useAppStore.getState().sessionClient).toBeNull();
  });
});
