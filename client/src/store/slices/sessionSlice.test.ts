import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Client } from '@/api/types';

import { useAppStore } from '../useAppStore';

/**
 * The state machine `RequireAuth` and `RootRedirect` read, and the mapping from
 * the Auth0 SDK's two flags onto it. The mapping lives in the slice precisely so
 * that it can be tested here — a browser, a provider and a redirect are not
 * needed to answer what `isLoading: false, isAuthenticated: true` should mean.
 */

const { getMe, identifyClient } = vi.hoisted(() => ({
  getMe: vi.fn(),
  identifyClient: vi.fn(),
}));

// Partial mocks, not replacements: the store composes two slices, so a factory
// that returned only what this file uses would break the moment the *other*
// slice imported something else from the same module.
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

    // The one state that must not leak out early. `isAuthenticated` is false
    // during the whole of a cold load, including while the SDK is renewing a
    // perfectly good session, and treating that as signed-out would bounce every
    // returning athlete to the login page.
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
    // The internal id, not the Auth0 subject: it is what every server-side row
    // is keyed by, so it is what the funnel has to be keyed by.
    expect(identifyClient).toHaveBeenCalledWith(UUID);
  });

  // Authenticated is not resolved. A token the API will not honour, or an API
  // that cannot be reached at all, leaves an athlete with no internal id — and
  // signing them in without one would hand every consumer a null client to
  // defend against.
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
