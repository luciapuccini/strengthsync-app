import type { StateCreator } from 'zustand'

import type { AppStore } from '../useAppStore'

export type SelectedClientSlice = {
  selectedClientId: string | null
  selectClient: (id: string) => void
  clearSelectedClient: () => void
}

export const createSelectedClientSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never]],
  [],
  SelectedClientSlice
> = (set) => ({
  selectedClientId: null,
  selectClient: (id) => set({ selectedClientId: id }, false, 'selectClient'),
  clearSelectedClient: () => set({ selectedClientId: null }, false, 'clearSelectedClient'),
})
