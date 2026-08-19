import type { StateCreator } from 'zustand';

import type { Client } from '@/api/types';

import { identifyClient } from '@/lib/analytics';

import type { AppStore } from '../useAppStore';

/**
 * Who is signed in. The store holds this rather than a module-level promise
 * cache because it is shared app state, and the store is the single source of
 * truth for that.
 *
 * `loading` is the state before the bootstrap answers, and it is the initial
 * one: on a cold load nobody knows yet whether the athlete is signed in, and the
 * guard must not redirect while that is still open. That reason survives the
 * migration intact, which is why all three states are still here — see
 * `issues/011-amputate-old-auth.md`.
 *
 * Only the *source* of the state changed, and right now there isn't one. The
 * route that answered "who is signed in" is deleted and the Auth0 SDK is not
 * wired in until `issues/013-web-app-universal-login.md`, so the bootstrap
 * resolves straight to signed-out and nobody can get past `RequireAuth`.
 */
export type SessionStatus = 'loading' | 'signed-in' | 'signed-out';

export type SessionSlice = {
  sessionStatus: SessionStatus;
  sessionClient: Client | null;
  bootstrapSession: () => Promise<void>;
  markSignedIn: (client: Client) => void;
  signOutSession: () => void;
};

export const createSessionSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never]],
  [],
  SessionSlice
> = (set) => ({
  sessionStatus: 'loading',
  sessionClient: null,

  // Nothing to ask yet, so resolve the way a rejected credential always did:
  // without a verified identity there is nothing to show. Kept async, and kept
  // being awaited by the bootstrap effect in App.tsx, so issue 013 changes what
  // happens inside it and not a single caller.
  bootstrapSession: async () => {
    await Promise.resolve();
    set({ sessionStatus: 'signed-out', sessionClient: null }, false, 'bootstrapSession/out');
  },

  // No caller until issue 013: the two screens that used to call this after a
  // successful sign-in are deleted, and the SDK's authenticated flag replaces
  // them. Kept because the transition into `signed-in` has to exist somewhere,
  // and identifying the athlete to PostHog on the way through is the behaviour
  // issue 013's cold-load path needs.
  markSignedIn: (client) => {
    identifyClient(client.id);
    set({ sessionStatus: 'signed-in', sessionClient: client }, false, 'markSignedIn');
  },

  signOutSession: () =>
    set({ sessionStatus: 'signed-out', sessionClient: null }, false, 'signOutSession'),
});
