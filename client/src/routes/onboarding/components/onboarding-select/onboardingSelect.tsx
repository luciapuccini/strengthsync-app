import type { JSX } from 'react';

import { cn } from '@/shadcn/lib/utils';

/** A native `<select>` styled to match `Input`, since the design system has no Select yet. */
export function OnboardingSelect({
  className,
  children,
  ...props
}: React.ComponentProps<'select'>): JSX.Element {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:h-9 md:text-sm',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
