import { use } from 'react'
import type { JSX } from 'react'
import { Navigate } from 'react-router-dom'

import { useSelectedClient } from '@/contexts/selectedClient'
import { clientsResource } from '@/api/weekResource'

export function HomeRedirect(): JSX.Element {
  const { clientId } = useSelectedClient()
  const clients = use(clientsResource())
  const targetClientId = clientId ?? clients[0]?.id ?? null
  return (
    <Navigate
      to={targetClientId === null ? '/clients' : `/clients/${targetClientId}/track`}
      replace
    />
  )
}
