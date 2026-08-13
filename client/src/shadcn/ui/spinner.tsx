import { LoaderCircle } from 'lucide-react';
import type { ComponentProps, JSX } from 'react';

import { cn } from '@/shadcn/lib/utils';

export function Spinner({ className, ...props }: ComponentProps<'svg'>): JSX.Element {
  return (
    <LoaderCircle aria-hidden="true" className={cn('size-4 animate-spin', className)} {...props} />
  );
}
