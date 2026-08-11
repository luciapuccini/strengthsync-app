import type { JSX } from 'react'

export function NotFound(): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="text-muted-foreground">That page does not exist.</p>
    </div>
  )
}
