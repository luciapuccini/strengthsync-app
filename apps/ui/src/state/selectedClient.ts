import { createContext, useContext } from 'react'

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
