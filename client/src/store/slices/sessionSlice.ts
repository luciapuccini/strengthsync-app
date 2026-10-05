import type { StateCreator } from 'zustand';

import type { Client } from '@/api/types';

import { getMe, updateUnitPreference } from '@/api/client';
import { identifyClient } from '@/lib/analytics';

import type { AppStore } from '../useAppStore';

export type SessionStatus = 'loading' | 'signed-in' | 'signed-out';

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
      set({ sessionStatus: 'signed-out', sessionClient: null }, false, 'resolveSession/failed');
    }
  },

  markSignedIn: (client) => {
    identifyClient(client.id);
    set({ sessionStatus: 'signed-in', sessionClient: client }, false, 'markSignedIn');
  },

  setUnitPreference: async (preference) => {
    const client = await updateUnitPreference(preference);
    set({ sessionClient: client }, false, 'setUnitPreference');
  },

  signOutSession: () =>
    set({ sessionStatus: 'signed-out', sessionClient: null }, false, 'signOutSession'),
});
