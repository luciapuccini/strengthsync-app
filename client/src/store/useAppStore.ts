import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { createSessionSlice } from './slices/sessionSlice';
import type { SessionSlice } from './slices/sessionSlice';
import { createTrackerSlice } from './slices/trackerSlice';
import type { TrackerSlice } from './slices/trackerSlice';

/**
 * Single, devtools-inspectable source of truth for the app's core state: who is
 * signed in, and the tracker data `{ client, plan, week }` plus its mutations.
 * The selected-client slice is gone: with one athlete per session there is
 * nothing to select.
 * See docs/in_progress/ui_refactor_audit.md (F1).
 */
export type AppStore = SessionSlice & TrackerSlice;

export const useAppStore = create<AppStore>()(
  devtools(
    (...a) => ({
      ...createSessionSlice(...a),
      ...createTrackerSlice(...a),
    }),
    { name: 'strengthsync-app-store' },
  ),
);
