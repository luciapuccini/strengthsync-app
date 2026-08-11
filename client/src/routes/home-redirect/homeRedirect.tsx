import { use } from 'react'
import type { JSX } from 'react'
import { Navigate } from 'react-router-dom'

import { clientsResource } from '@/api/weekResource'
import { useAppStore } from '@/store/useAppStore'

export function HomeRedirect(): JSX.Element {
  const clientId = useAppStore((s) => s.selectedClientId)
  const clients = use(clientsResource())
  const targetClientId = clientId ?? clients[0]?.id ?? null
  return (
    <Navigate
      to={targetClientId === null ? '/clients' : `/clients/${targetClientId}/track`}
      replace
    />
  )
}
