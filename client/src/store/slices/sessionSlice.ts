import type { StateCreator } from 'zustand';

import type { Client } from '@/api/types';

import { getMe, updateUnitPreference } from '@/api/client';
import { identifyClient } from '@/lib/analytics';

import type { AppStore } from '../useAppStore';

/**
 * Who is signed in. The store holds this rather than a module-level promise
 * cache because it is shared app state, and the store is the single source of
 * truth for that.
 *
 * `loading` is the state before the provider answers, and it is the initial
 * one: on a cold load nobody knows yet whether the athlete is signed in, and the
 * guard must not redirect while that is still open. That reason survives the
 * migration intact, which is why all three states are still here — see
 * `issues/011-amputate-old-auth.md`.
 *
 * Only the *source* of the state changed. It used to be `GET /auth/session`;
 * it is now the Auth0 SDK's own two flags, plus one call to `GET /api/me` for
 * the internal athlete id that the provider does not know about.
 */
export type SessionStatus = 'loading' | 'signed-in' | 'signed-out';

/** The two flags `useAuth0()` exposes, and the whole of what this slice reads. */
export type ProviderSession = {
  isLoading: boolean;
  isAuthenticated: boolean;
};

export type SessionSlice = {
  sessionStatus: SessionStatus;
  sessionClient: Client | null;
  resolveSession: (provider: ProviderSession) => Promise<void>;
  markSignedIn: (client: Client) => void;
  setUnitPreference: (preference: Client['unit_preference']) => Promise<void>;
  signOutSession: () => void;
};

export const createSessionSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never]],
  [],
  SessionSlice
> = (set, get) => ({
  sessionStatus: 'loading',
  sessionClient: null,

  /**
   * Called from `App` whenever the SDK's flags change, which is the only thing
   * that drives this state machine. The mapping lives here rather than in the
   * effect that calls it so that it can be exercised without a browser, a
   * provider or a redirect.
   *
   * Being authenticated is not the same as being resolved: the provider knows
   * the athlete's `sub` and nothing else, so the internal id still has to be
   * read. Until it is, the status stays `loading` rather than flipping to
   * `signed-in` with a null client — a state every consumer would then have to
   * defend against.
   */
  resolveSession: async ({ isLoading, isAuthenticated }) => {
    if (isLoading) {
      set({ sessionStatus: 'loading' }, false, 'resolveSession/loading');
      return;
    }
    if (!isAuthenticated) {
      set({ sessionStatus: 'signed-out', sessionClient: null }, false, 'resolveSession/out');
      return;
    }
    try {
      get().markSignedIn(await getMe());
    } catch {
      // A verified token that cannot be resolved to an athlete is not a signed-in
      // athlete, whether the cause is a rejected credential or an API that is
      // simply down. Both settle here, and `signInRoute` is what keeps the second
      // one from turning into a redirect loop.
      set({ sessionStatus: 'signed-out', sessionClient: null }, false, 'resolveSession/failed');
    }
  },

  // Identifying the athlete to PostHog on the way through is what keeps the MVP
  // funnel readable across the migration: every later event is tied to the
  // internal id, which is the id the server's data is keyed by.
  markSignedIn: (client) => {
    identifyClient(client.id);
    set({ sessionStatus: 'signed-in', sessionClient: client }, false, 'markSignedIn');
  },

  /**
   * Writes the preference and adopts the client the endpoint answers with — no
   * refetch, because that response *is* the new client.
   *
   * Deliberately not routed through `markSignedIn`: that identifies the athlete
   * to PostHog, which is right once per session and wrong on every toggle. It
   * also does not catch — the caller is the control that has to tell the athlete
   * the write failed, and swallowing the error here would leave it showing a
   * value the server never stored.
   */
  setUnitPreference: async (preference) => {
    const client = await updateUnitPreference(preference);
    set({ sessionClient: client }, false, 'setUnitPreference');
  },

  // Local state only. Ending the session at Auth0 is `signOutButton`'s job, and
  // it is a redirect rather than a state change.
  signOutSession: () =>
    set({ sessionStatus: 'signed-out', sessionClient: null }, false, 'signOutSession'),
});
