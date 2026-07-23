import { createContext, useContext } from 'react'

/**
 * Single-coach MVP: exactly one client is "in focus" at a time. The choice is
 * persisted to localStorage so a reload lands back on the same client.
 */
export const SELECTED_CLIENT_STORAGE_KEY = 'strengthsync.selectedClientId'

export type SelectedClientValue = {
  clientId: string | null
  select: (id: string) => void
  clear: () => void
}

export const SelectedClientContext = createContext<SelectedClientValue | null>(null)

export function useSelectedClient(): SelectedClientValue {
  const ctx = useContext(SelectedClientContext)
  if (!ctx) throw new Error('useSelectedClient must be used within a SelectedClientProvider')
  return ctx
}

export function readStoredClientId(): string | null {
  try {
    return localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeStoredClientId(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(SELECTED_CLIENT_STORAGE_KEY)
    else localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, id)
  } catch (error) {
    console.warn('selectedClient: localStorage unavailable', error)
  }
}
