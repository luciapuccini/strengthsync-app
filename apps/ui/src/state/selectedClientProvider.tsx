import { useCallback, useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'

import {
  SelectedClientContext,
  readStoredClientId,
  writeStoredClientId,
  type SelectedClientValue,
} from './selectedClient'

export function SelectedClientProvider({ children }: { children: ReactNode }): JSX.Element {
  const [clientId, setClientId] = useState<string | null>(readStoredClientId)

  const select = useCallback((id: string) => {
    setClientId(id)
    writeStoredClientId(id)
  }, [])

  const clear = useCallback(() => {
    setClientId(null)
    writeStoredClientId(null)
  }, [])

  const value = useMemo<SelectedClientValue>(
    () => ({ clientId, select, clear }),
    [clientId, select, clear],
  )

  return <SelectedClientContext.Provider value={value}>{children}</SelectedClientContext.Provider>
}
