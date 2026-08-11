import type { JSX } from 'react'

export function CredentialsNotice(): JSX.Element {
  return (
    <div className="rounded-md border border-border p-6">
      <h1 className="text-lg font-semibold">Check your credentials</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The server rejected the request. Reload the page and sign in with the shared coach
        credentials.
      </p>
    </div>
  )
}
