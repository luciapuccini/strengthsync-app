import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { createSelectedClientSlice } from './slices/selectedClientSlice'
import type { SelectedClientSlice } from './slices/selectedClientSlice'
import { createTrackerSlice } from './slices/trackerSlice'
import type { TrackerSlice } from './slices/trackerSlice'

/**
 * Single, devtools-inspectable source of truth for the app's core state:
 * the selected client (navigation) and the tracker data `{ client, plan, week }`
 * plus its mutations. See docs/in_progress/ui_refactor_audit.md (F1).
 */
export type AppStore = SelectedClientSlice & TrackerSlice

export const useAppStore = create<AppStore>()(
  devtools(
    (...a) => ({
      ...createSelectedClientSlice(...a),
      ...createTrackerSlice(...a),
    }),
    { name: 'strengthsync-app-store' },
  ),
)
