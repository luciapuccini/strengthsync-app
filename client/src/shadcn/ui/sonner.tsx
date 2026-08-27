import * as React from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// The app renders on a fixed dark theme (see index.html / index.css); no
// theme provider is wired for the MVP.
//
// Top-centre rather than sonner's bottom-right default, which lands underneath
// the fixed tab bar. Offsetting the toasts above the bar instead would mean a
// magic number kept in step with the bar's height and the safe-area inset.
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          success: '!border-primary !bg-primary !text-primary-foreground',
        },
      }}
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
  );
}

export { Toaster };
