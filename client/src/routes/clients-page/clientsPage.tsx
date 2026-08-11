import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { useNavigate } from 'react-router-dom'

import type { Client } from '@/api/types'

import { getClients } from '@/api/client'
import { ApiClientError } from '@/api/errors'
import { ClientList } from '@/routes/clients-page/components/client-list/clientList'
import { CreateClientForm } from '@/routes/clients-page/components/create-client-form/createClientForm'
import { CredentialsNotice } from '@/routes/clients-page/components/credentials-notice/credentialsNotice'
import { useAppStore } from '@/store/useAppStore'

export function ClientsPage(): JSX.Element {
  const [clients, setClients] = useState<Client[] | null>(null)
  const [error, setError] = useState<ApiClientError | null>(null)
  const select = useAppStore((s) => s.selectClient)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    getClients()
      .then((list) => {
        if (active) setClients(list)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof ApiClientError ? requestError : null)
        }
      })
    return () => {
      active = false
    }
  }, [])

  function openClient(id: string): void {
    select(id)
    navigate(`/clients/${id}/track`)
  }

  if (error?.kind === 'unauthorized') return <CredentialsNotice />

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Clients</h1>
      <CreateClientForm
        onCreated={(client) => {
          setClients((previous) => [...(previous ?? []), client])
          openClient(client.id)
        }}
      />
      <ClientList clients={clients} error={error} onSelect={openClient} />
    </div>
  )
}
