import type { StateCreator } from 'zustand';

import type { Client } from '@/api/types';

import { getSession } from '@/api/client';
import { identifyClient } from '@/lib/analytics';

import type { AppStore } from '../useAppStore';

/**
 * Who is signed in. The store holds this rather than a module-level promise
 * cache because it is shared app state, and the store is the single source of
 * truth for that.
 *
 * `loading` is the state before the bootstrap call answers, and it is the
 * initial one: on a cold load nobody knows yet whether the cookie is good, and
 * the guard must not redirect to sign-in while that is still open.
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

  // Any failure means signed out, not just a 401: without a verified session
  // there is nothing to show, and a network error resolves the same way a
  // rejected cookie does.
  bootstrapSession: async () => {
    try {
      const client = await getSession();
      identifyClient(client.id);
      set({ sessionStatus: 'signed-in', sessionClient: client }, false, 'bootstrapSession/in');
    } catch {
      set({ sessionStatus: 'signed-out', sessionClient: null }, false, 'bootstrapSession/out');
    }
  },

  markSignedIn: (client) => {
    identifyClient(client.id);
    set({ sessionStatus: 'signed-in', sessionClient: client }, false, 'markSignedIn');
  },

  signOutSession: () =>
    set({ sessionStatus: 'signed-out', sessionClient: null }, false, 'signOutSession'),
});
