import type { ComponentProps, JSX } from 'react'

import { cn } from '@/shadcn/lib/utils'

export function Badge({ className, ...props }: ComponentProps<'span'>): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border px-2 py-1 text-[10px] font-bold tracking-wide uppercase',
        className,
      )}
      {...props}
    />
  )
}
