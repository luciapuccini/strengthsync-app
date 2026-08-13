import type { JSX } from 'react';

import { cn } from '@/shadcn/lib/utils';

export function BrandMark({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 font-semibold tracking-tight',
        className,
      )}
    >
      <img
        src="/android-chrome-192x192.png"
        alt="StrengthSync logo"
        className="h-8 w-8 rounded-md"
      />
      <span className="text-lg">
        StrengthSync
        <span className="ml-1 align-top font-mono text-[10px] text-muted-foreground">beta</span>
      </span>
    </div>
  );
}
