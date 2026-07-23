import * as React from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

// The app renders on a fixed dark theme (see index.html / index.css); no
// theme provider is wired for the MVP.
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
