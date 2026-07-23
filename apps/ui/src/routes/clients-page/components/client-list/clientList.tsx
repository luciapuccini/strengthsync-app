import type { JSX } from 'react'

import type { Client } from '@strengthsync/domain/model'

import type { ApiClientError } from '@/api/errors'

type ClientListProps = {
  clients: Client[] | null
  error: ApiClientError | null
  onSelect: (id: string) => void
}

export function ClientList({ clients, error, onSelect }: ClientListProps): JSX.Element {
  if (error !== null) return <p className="text-destructive">{error.message}</p>
  if (clients === null) return <p className="text-muted-foreground">Loading clients…</p>
  if (clients.length === 0) {
    return <p className="text-muted-foreground">No clients yet. Add your first one above.</p>
  }
  return (
    <ul className="flex flex-col gap-2">
      {clients.map((client) => (
        <li key={client.id}>
          <button
            type="button"
            onClick={() => onSelect(client.id)}
            className="min-h-11 w-full rounded-md border border-border px-4 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {client.display_name}
          </button>
        </li>
      ))}
    </ul>
  )
}
