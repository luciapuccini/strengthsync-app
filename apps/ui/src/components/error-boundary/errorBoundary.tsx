import { Component } from 'react'
import type { ErrorInfo, JSX, ReactNode } from 'react'

import { Button } from '@/shadcn/ui/button'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { error: null }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Tracker failed to render', error, info)
  }

  public override render(): JSX.Element {
    if (this.state.error !== null) {
      return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5">
          <h1 className="text-lg font-semibold">Could not load your week</h1>
          <p className="mt-2 text-sm text-muted-foreground">{this.state.error.message}</p>
          <Button className="mt-4 min-h-11" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      )
    }
    return <>{this.props.children}</>
  }
}
