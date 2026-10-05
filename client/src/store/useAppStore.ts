import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { createSessionSlice } from './slices/sessionSlice';
import type { SessionSlice } from './slices/sessionSlice';
import { createTrackerSlice } from './slices/trackerSlice';
import type { TrackerSlice } from './slices/trackerSlice';

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
