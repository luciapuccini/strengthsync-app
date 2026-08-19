import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Client } from '@/api/types';

import { useAppStore } from '../useAppStore';

/**
 * The three states survive `issues/011-amputate-old-auth.md`; their source does
 * not. `bootstrapSession` no longer asks anything — there is nothing to ask
 * until `issues/013-web-app-universal-login.md` wires the Auth0 SDK in — so the
 * cases that stubbed a session read are gone, and what is pinned here is the
 * shape `RequireAuth` and `RootRedirect` depend on.
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

beforeEach(() => {
  useAppStore.setState({ sessionStatus: 'loading', sessionClient: null }, false);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('sessionSlice', () => {
  it('starts out loading, with nobody signed in', () => {
    expect(useAppStore.getState().sessionStatus).toBe('loading');
    expect(useAppStore.getState().sessionClient).toBeNull();
  });

  // The interim behaviour, pinned deliberately rather than left implicit: while
  // there is no identity provider wired up, a cold load has to *settle* on
  // signed-out. Leaving it on `loading` would hang the guard on a spinner
  // forever, which is the one failure mode this state machine exists to prevent.
  it('bootstraps to signed-out, because there is nothing to ask yet', async () => {
    await useAppStore.getState().bootstrapSession();

    expect(useAppStore.getState().sessionStatus).toBe('signed-out');
    expect(useAppStore.getState().sessionClient).toBeNull();
  });

  it('marks signed in, for the caller issue 013 adds', () => {
    useAppStore.getState().markSignedIn(client);

    expect(useAppStore.getState().sessionStatus).toBe('signed-in');
    expect(useAppStore.getState().sessionClient).toEqual(client);
  });

  it('clears the client on sign-out', () => {
    useAppStore.getState().markSignedIn(client);
    useAppStore.getState().signOutSession();

    expect(useAppStore.getState().sessionStatus).toBe('signed-out');
    expect(useAppStore.getState().sessionClient).toBeNull();
  });
});
