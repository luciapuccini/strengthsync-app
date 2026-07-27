import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'

export type SelectedClientValue = {
  clientId: string | null
  select: (id: string) => void
  clear: () => void
}

const SelectedClientContext = createContext<SelectedClientValue | null>(null)

export function SelectedClientProvider({ children }: { children: ReactNode }): JSX.Element {
  const [clientId, setClientId] = useState<string | null>(null)

  const select = useCallback((id: string) => {
    setClientId(id)
  }, [])

  const clear = useCallback(() => {
    setClientId(null)
  }, [])

  const value = useMemo<SelectedClientValue>(
    () => ({ clientId, select, clear }),
    [clientId, select, clear],
  )

  return <SelectedClientContext.Provider value={value}>{children}</SelectedClientContext.Provider>
}

// The context provider and its exposing hook intentionally share this module.
// eslint-disable-next-line react-refresh/only-export-components
export function useSelectedClient(): SelectedClientValue {
  const ctx = useContext(SelectedClientContext)
  if (!ctx) throw new Error('useSelectedClient must be used within a SelectedClientProvider')
  return ctx
}
