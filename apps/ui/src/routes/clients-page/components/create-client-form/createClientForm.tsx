import { useState } from 'react'
import type { FormEvent, JSX } from 'react'
import { toast } from 'sonner'

import type { Client } from '@strengthsync/domain/model'

import { createClient } from '@/api/client'
import { ApiClientError } from '@/api/errors'
import { Button } from '@/shadcn/ui/button'
import { Input } from '@/shadcn/ui/input'

type CreateClientFormProps = {
  onCreated: (client: Client) => void
}

export function CreateClientForm({ onCreated }: CreateClientFormProps): JSX.Element {
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const displayName = name.trim()
    if (displayName.length === 0) return
    setIsSaving(true)
    try {
      const client = await createClient({ display_name: displayName })
      toast.success(`Added ${client.display_name}`)
      setName('')
      onCreated(client)
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : 'Could not create client')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        aria-label="New client name"
        placeholder="New client name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        disabled={isSaving}
      />
      <Button
        type="submit"
        className="min-h-11"
        disabled={isSaving || name.trim().length === 0}
      >
        Add client
      </Button>
    </form>
  )
}
