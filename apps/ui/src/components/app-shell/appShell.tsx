import type { JSX } from 'react'
import { Link, Outlet } from 'react-router-dom'

import { Toaster } from '@/shadcn/ui/sonner'

export function AppShell(): JSX.Element {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            StrengthSync
          </Link>
          <nav>
            <Link to="/clients" className="text-sm text-muted-foreground hover:text-foreground">
              Clients
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-5 sm:px-4 md:px-6 md:py-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
